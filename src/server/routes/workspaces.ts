import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import {
  createWorkspace,
  listWorkspacesForUser
} from "@/db/repositories/workspaces";

const CreateBody = z.object({
  displayName: z
    .string()
    .min(1, "Workspace name is required")
    .max(80, "Keep it under 80 characters"),
  githubOrg: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, digits, and hyphens only")
    .optional()
});

export const workspacesRouter = new Hono()
  .use("*", requireUser)
  .get("/", async (c) => {
    const userId = c.var.userId;
    const list = await listWorkspacesForUser(userId);
    return c.json({ workspaces: list });
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

    const created = await createWorkspace({
      ownerId: c.var.userId,
      displayName: parsed.data.displayName,
      githubOrg: parsed.data.githubOrg ?? null
    });

    return c.json({ workspace: created }, 201);
  });
