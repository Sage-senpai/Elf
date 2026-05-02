import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  attachmentTypeValues,
  createAttachment,
  listProjectAttachments,
  softDeleteAttachment
} from "@/db/repositories/attachments";

/**
 * Mounted at /api/workspaces/:codename/projects/:slug/attachments
 *
 *   GET    /            list non-deleted attachments
 *   POST   /            add an attachment (any non-viewer role)
 *   DELETE /:id         soft-delete (manager or original adder)
 */

const TypeEnum = z.enum(attachmentTypeValues);

const CreateBody = z.object({
  type: TypeEnum,
  title: z.string().min(1, "Title is required").max(120),
  url: z
    .string()
    .url("Must be a valid URL")
    .max(1024)
    .optional()
});

export const attachmentsRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .get("/", async (c) => {
    const list = await listProjectAttachments(c.var.project.id);
    return c.json({ attachments: list });
  })
  .post("/", async (c) => {
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
    const created = await createAttachment({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id,
      addedBy: c.var.userId,
      type: parsed.data.type,
      title: parsed.data.title,
      url: parsed.data.url ?? null
    });
    return c.json({ attachment: created }, 201);
  })
  .delete("/:id", async (c) => {
    if (c.var.workspaceRole === "viewer") {
      return c.json({ error: "forbidden", reason: "viewer_role" }, 403);
    }
    await softDeleteAttachment(c.var.project.id, c.req.param("id"));
    return c.json({ ok: true });
  });
