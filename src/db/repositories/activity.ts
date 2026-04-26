import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { activity, type Activity } from "@/db/schema/activity";

/**
 * Activity feed — the workspace-wide event stream.
 *
 * Lighter than the audit log:
 *  - Postgres only (no 0G upload)
 *  - Soft-mutable (we'd never reach for this, but it isn't tamper-proof)
 *  - Designed for human reading: "Yusuf added quiz scoring", not a JSON envelope
 *
 * Both surfaces are populated from the same triggers (createWorkspace,
 * createProject, createCommit) — the audit log is the legal record, the
 * activity feed is the dopamine hit.
 */

export type ActivityEventType =
  | "workspace.created"
  | "project.created"
  | "project.status_changed"
  | "commit.created"
  | "fork.requested"
  | "fork.approved"
  | "fork.rejected"
  | "member.invited"
  | "member.joined"
  | "cowork.session_started"
  | "attachment.added"
  | "payment.created"
  | "payment.settled"
  | "agent.action";

export type WriteActivityInput = {
  workspaceId: string;
  projectId?: string | null;
  actorId?: string | null;
  type: ActivityEventType;
  payload?: Record<string, unknown>;
};

export async function writeActivity(input: WriteActivityInput): Promise<Activity> {
  const [row] = await db
    .insert(activity)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      actorId: input.actorId ?? null,
      type: input.type,
      payload: input.payload ?? {}
    })
    .returning();
  return row;
}

/**
 * Workspace activity feed, newest-first. Capped at 100 to keep large
 * workspaces from blowing up a single render.
 */
export async function listWorkspaceActivity(
  workspaceId: string,
  limit = 30
): Promise<Activity[]> {
  return db
    .select()
    .from(activity)
    .where(eq(activity.workspaceId, workspaceId))
    .orderBy(desc(activity.createdAt))
    .limit(Math.min(limit, 100));
}
