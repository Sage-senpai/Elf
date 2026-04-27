import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  createForkRequest,
  findForkRequest,
  listForkRequests,
  listProjectForkRequests,
  listPendingFork
} from "@/db/repositories/forks";
import { approveAndExecuteFork, rejectFork } from "@/lib/forks/execution";

/**
 * Two router groups:
 *   /api/workspaces/:codename/forks                      list / approve / reject
 *   /api/workspaces/:codename/projects/:slug/forks       project-scoped: request / list
 *
 * Approval requires manager role + a deliberate two-step (the UI sends
 * the second-step confirmation as { confirm: true }). Spec section 3,
 * UX expert: "It must be impossible to accidentally approve."
 */

const RequestBody = z.object({
  requesterNote: z.string().max(500).optional()
});

const ReviewBody = z.object({
  decision: z.enum(["approved", "rejected"]),
  confirm: z.literal(true, {
    errorMap: () => ({
      message: "confirm must be true — second-step confirmation required"
    })
  }),
  reviewerNote: z.string().max(500).optional()
});

export const projectForksRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .get("/", async (c) => {
    const list = await listProjectForkRequests(c.var.project.id);
    return c.json({ forks: list });
  })
  .post("/", async (c) => {
    let body: unknown = {};
    try {
      body = await c.req.json();
    } catch {
      // empty body is fine
    }
    const parsed = RequestBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }

    // Don't let one user open multiple pending requests for the same project.
    const existing = await listPendingFork({
      projectId: c.var.project.id,
      requesterId: c.var.userId
    });
    if (existing) {
      return c.json({ error: "already_pending", fork: existing }, 409);
    }

    const fork = await createForkRequest({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id,
      requesterId: c.var.userId,
      requesterNote: parsed.data.requesterNote ?? null
    });
    return c.json({ fork }, 201);
  });

export const workspaceForksRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .get("/", async (c) => {
    const url = new URL(c.req.url);
    const status = url.searchParams.get("status") as
      | "pending"
      | "approved"
      | "rejected"
      | null;
    const list = await listForkRequests({
      workspaceId: c.var.workspace.id,
      status: status ?? undefined
    });
    return c.json({ forks: list });
  })
  .get("/:forkId", async (c) => {
    const fork = await findForkRequest(c.req.param("forkId"));
    if (!fork || fork.workspaceId !== c.var.workspace.id) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ fork });
  })
  .patch("/:forkId", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden", reason: "manager_only" }, 403);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const parsed = ReviewBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }

    const fork = await findForkRequest(c.req.param("forkId"));
    if (!fork || fork.workspaceId !== c.var.workspace.id) {
      return c.json({ error: "not_found" }, 404);
    }
    if (fork.status !== "pending") {
      return c.json(
        { error: "already_reviewed", currentStatus: fork.status },
        409
      );
    }

    if (parsed.data.decision === "rejected") {
      const updated = await rejectFork({
        fork,
        reviewerId: c.var.userId,
        reviewerNote: parsed.data.reviewerNote ?? null
      });
      return c.json({ fork: updated });
    }

    try {
      const result = await approveAndExecuteFork({
        fork,
        reviewerId: c.var.userId,
        reviewerNote: parsed.data.reviewerNote ?? null
      });
      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "execution_failed";
      return c.json({ error: "execution_failed", message }, 500);
    }
  });
