import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import {
  createProject,
  findProjectBySlug,
  listProjects,
  slugify,
  SlugTakenError,
  type ProjectStatus
} from "@/db/repositories/projects";

const StatusEnum = z.enum(["active", "wip", "concept", "archived"]);

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, and hyphens only")
    .optional(),
  description: z.string().max(500).optional(),
  niche: z.string().max(40).optional(),
  status: StatusEnum.default("concept"),
  stack: z.array(z.string().max(40)).max(20).default([]),
  tags: z.array(z.string().max(40)).max(20).default([]),
  githubRepo: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Use "owner/repo" form')
    .optional(),
  previewUrl: z.string().url().optional()
});

/**
 * Mounted under /api/workspaces/:codename/projects
 */
export const projectsRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .get("/", async (c) => {
    const list = await listProjects(c.var.workspace.id);
    return c.json({ projects: list });
  })
  .post("/", async (c) => {
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

    const slug = parsed.data.slug ?? (await pickAvailableSlug(c.var.workspace.id, parsed.data.name));

    try {
      const project = await createProject({
        workspaceId: c.var.workspace.id,
        ownerId: c.var.userId,
        name: parsed.data.name,
        slug,
        description: parsed.data.description ?? null,
        niche: parsed.data.niche ?? null,
        status: parsed.data.status as ProjectStatus,
        stack: parsed.data.stack,
        tags: parsed.data.tags,
        githubRepo: parsed.data.githubRepo ?? null,
        previewUrl: parsed.data.previewUrl ?? null
      });
      return c.json({ project }, 201);
    } catch (err) {
      if (err instanceof SlugTakenError) {
        return c.json({ error: "slug_taken", slug: err.slug }, 409);
      }
      throw err;
    }
  })
  .get("/:slug", async (c) => {
    const project = await findProjectBySlug(c.var.workspace.id, c.req.param("slug"));
    if (!project) return c.json({ error: "not_found" }, 404);
    return c.json({ project });
  });

/**
 * Generate a slug from `name` and append -2, -3, ... until one is free.
 * Bounded retries — fall back to slug-<random> after too many collisions.
 */
async function pickAvailableSlug(workspaceId: string, name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await findProjectBySlug(workspaceId, candidate);
    if (!existing) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}
