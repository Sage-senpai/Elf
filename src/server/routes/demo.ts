import { Hono } from "hono";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import { seedProjectDemo, wipeProjectDemo } from "@/lib/demo/seed";

/**
 * Mounted at /api/workspaces/:codename/projects/:slug/demo.
 *
 *   POST /seed   Drop a batch of demo commits, notes, references, a
 *                treasury, and settled payments into this project.
 *                Manager-only — this is for video-recording prep, not
 *                user-facing functionality.
 */

export const demoRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .post("/seed", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    const result = await seedProjectDemo({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id,
      userId: c.var.userId
    });
    return c.json({ ok: true, result });
  })
  .post("/wipe", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    const result = await wipeProjectDemo({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id
    });
    return c.json({ ok: true, result });
  });
