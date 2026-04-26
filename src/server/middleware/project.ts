import type { MiddlewareHandler } from "hono";
import { findProjectBySlug, type Project } from "@/db/repositories/projects";

declare module "hono" {
  interface ContextVariableMap {
    project: Project;
  }
}

/**
 * Resolves :slug from the route within the workspace already loaded by
 * requireWorkspace. Compose AFTER requireUser + requireWorkspace.
 *
 * 404 for missing or soft-deleted projects.
 */
export const requireProject: MiddlewareHandler = async (c, next) => {
  const slug = c.req.param("slug");
  if (!slug) return c.json({ error: "missing_slug" }, 400);

  const project = await findProjectBySlug(c.var.workspace.id, slug);
  if (!project) return c.json({ error: "not_found" }, 404);

  c.set("project", project);
  await next();
};
