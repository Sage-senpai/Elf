import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  createCommit,
  listProjectCommits,
  commitTypeValues
} from "@/db/repositories/commits";

const TypeEnum = z.enum(commitTypeValues);

const CreateBody = z.object({
  type: TypeEnum,
  scope: z.string().max(40).optional(),
  summary: z.string().min(1, "Summary is required").max(72, "Keep under 72 chars"),
  body: z.string().max(2000).optional(),
  footer: z.string().max(500).optional(),
  isBreaking: z.boolean().default(false),
  githubSha: z
    .string()
    .regex(/^[a-f0-9]{7,40}$/i, "SHA must be 7-40 hex chars")
    .optional()
});

/**
 * Mounted at /api/workspaces/:codename/projects/:slug/commits
 */
export const commitsRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .get("/", async (c) => {
    const list = await listProjectCommits(c.var.project.id);
    return c.json({ commits: list });
  })
  .post("/", async (c) => {
    // Viewers can read but not write.
    if (c.var.workspaceRole === "viewer") {
      return c.json({ error: "forbidden", reason: "viewer_role" }, 403);
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

    const commit = await createCommit({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id,
      authorId: c.var.userId,
      type: parsed.data.type,
      summary: parsed.data.summary,
      scope: parsed.data.scope ?? null,
      body: parsed.data.body ?? null,
      footer: parsed.data.footer ?? null,
      isBreaking: parsed.data.isBreaking,
      githubSha: parsed.data.githubSha ?? null
    });
    return c.json({ commit }, 201);
  });
