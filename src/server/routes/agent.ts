import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { getAgentStatus, runShelfAgent } from "@/lib/agent/shelf-agent";

/**
 * Mounted at /api/workspaces/:codename/agent
 *
 *   GET  /status   workspace agent state row (last run, stale list)
 *   POST /run      manager-only: triggers an immediate scan
 */

const RunBody = z.object({
  staleThresholdDays: z.number().int().min(1).max(90).optional()
});

export const agentRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .get("/status", async (c) => {
    const status = await getAgentStatus(c.var.workspace.id);
    return c.json({ status });
  })
  .post("/run", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden", reason: "manager_only" }, 403);
    }
    let body: unknown = {};
    try {
      body = await c.req.json();
    } catch {
      // Empty body is fine — defaults apply.
    }
    const parsed = RunBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }

    const result = await runShelfAgent({
      workspaceId: c.var.workspace.id,
      staleThresholdDays: parsed.data.staleThresholdDays,
      triggeredBy: c.var.userId
    });
    return c.json({
      result: {
        ...result,
        ranAt: result.ranAt.toISOString()
      }
    });
  });
