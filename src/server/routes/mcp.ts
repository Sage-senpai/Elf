import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import {
  createMcpKey,
  findActiveMcpKey,
  listMcpKeys,
  revokeMcpKey,
  touchMcpKey
} from "@/db/repositories/mcp";
import { listProjects } from "@/db/repositories/projects";
import { listProjectCommits } from "@/db/repositories/commits";
import { findWorkspaceByCodename } from "@/db/repositories/workspaces";

/**
 * MCP — Model Context Protocol.
 *
 * Two routers live in this file.
 *
 *  1. workspaceMcpRouter — manager-only key management surface, mounted
 *     at /api/workspaces/:codename/mcp-keys. Create / list / revoke.
 *
 *  2. mcpServerRouter — the actual MCP-over-HTTP endpoint, mounted at
 *     /api/mcp. Authenticated by the bearer key issued in (1). Supports
 *     `tools/list` and `tools/call` so clients like Cursor or Claude
 *     Desktop can read live workspace state without an Elf account.
 */

const CreateBody = z.object({
  name: z.string().min(1).max(80)
});

export const workspaceMcpRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .get("/", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    const keys = await listMcpKeys(c.var.workspace.id);
    return c.json({ keys });
  })
  .post("/", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const parsed = CreateBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }
    const { row, plaintext } = await createMcpKey({
      workspaceId: c.var.workspace.id,
      userId: c.var.userId,
      name: parsed.data.name
    });
    return c.json({ key: row, plaintext }, 201);
  })
  .delete("/:id", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    await revokeMcpKey(c.var.workspace.id, c.req.param("id"));
    return c.json({ ok: true });
  });

/* -------------------------------------------------------------------------- */
/*  MCP-over-HTTP server                                                       */
/* -------------------------------------------------------------------------- */

const TOOLS = [
  {
    name: "elf_list_projects",
    description: "List projects in the authenticated workspace.",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "elf_list_commits",
    description:
      "List recent commits for a project by slug. Returns the most recent 30 by default.",
    inputSchema: {
      type: "object",
      properties: {
        project_slug: { type: "string" },
        limit: { type: "number", default: 30 }
      },
      required: ["project_slug"]
    }
  }
];

async function authBearer(headerValue: string | undefined) {
  if (!headerValue) return null;
  const m = headerValue.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const key = await findActiveMcpKey(m[1]);
  if (!key) return null;
  void touchMcpKey(key.id).catch(() => {});
  return key;
}

export const mcpServerRouter = new Hono()
  .post("/", async (c) => {
    const key = await authBearer(c.req.header("authorization"));
    if (!key) return c.json({ error: "unauthorized" }, 401);

    let body: { method?: string; params?: Record<string, unknown> } | null = null;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }

    if (body?.method === "tools/list") {
      return c.json({ tools: TOOLS });
    }

    if (body?.method === "tools/call") {
      const name = body.params?.name as string | undefined;
      const args = (body.params?.arguments ?? {}) as Record<string, unknown>;

      if (name === "elf_list_projects") {
        const projects = await listProjects(key.workspaceId);
        return c.json({
          content: projects.map((p) => ({
            slug: p.slug,
            name: p.name,
            status: p.status,
            github_repo: p.githubRepo
          }))
        });
      }

      if (name === "elf_list_commits") {
        const slug = args.project_slug as string | undefined;
        if (!slug) return c.json({ error: "project_slug_required" }, 400);
        const projects = await listProjects(key.workspaceId);
        const project = projects.find((p) => p.slug === slug);
        if (!project) return c.json({ error: "project_not_found" }, 404);
        const limit = Math.min(Number(args.limit ?? 30), 100);
        const commits = await listProjectCommits(project.id, limit);
        return c.json({
          content: commits.map((commit) => ({
            type: commit.type,
            scope: commit.scope,
            summary: commit.summary,
            author_id: commit.authorId,
            github_sha: commit.githubSha,
            created_at: commit.createdAt
          }))
        });
      }

      return c.json({ error: "unknown_tool", name }, 404);
    }

    return c.json({ error: "unknown_method", method: body?.method ?? null }, 400);
  })
  .get("/", async (c) => {
    // Health probe so MCP clients can verify reachability before sending tools/list.
    const key = await authBearer(c.req.header("authorization"));
    if (!key) return c.json({ error: "unauthorized" }, 401);
    const workspace = await (async () => {
      const all = await listProjects(key.workspaceId);
      const ws = await findWorkspaceByCodenameById(key.workspaceId);
      return { codename: ws?.codename ?? null, projectCount: all.length };
    })();
    return c.json({ ok: true, workspace });
  });

async function findWorkspaceByCodenameById(workspaceId: string) {
  // Tiny shim — the workspaces repo only exposes findByCodename today.
  const { db } = await import("@/db/client");
  const { workspaces } = await import("@/db/schema/workspaces");
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return row ?? null;
}

// Silence unused import warning if other parts of the file change later.
void findWorkspaceByCodename;
