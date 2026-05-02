import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  clearProjectPermission,
  listProjectMembers,
  roleValues,
  setProjectPermission
} from "@/db/repositories/permissions";

/**
 * Mounted at /api/workspaces/:codename/projects/:slug/permissions
 *
 *   GET     /            list every workspace member with their effective
 *                        project role (manager-only)
 *   PATCH   /:userId     set or update an override role
 *   DELETE  /:userId     clear the override (revert to workspace role)
 */

const SetBody = z.object({
  role: z.enum(roleValues)
});

export const permissionsRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .get("/", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    const members = await listProjectMembers(
      c.var.workspace.id,
      c.var.project.id
    );
    return c.json({ members });
  })
  .patch("/:userId", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const parsed = SetBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }
    const permission = await setProjectPermission({
      projectId: c.var.project.id,
      userId: c.req.param("userId"),
      role: parsed.data.role,
      setBy: c.var.userId
    });
    return c.json({ permission });
  })
  .delete("/:userId", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    await clearProjectPermission({
      projectId: c.var.project.id,
      userId: c.req.param("userId")
    });
    return c.json({ ok: true });
  });
