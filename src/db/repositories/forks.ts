import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  forkRequests,
  type ForkRequest,
  type ForkStatus,
  type KeeperStatus
} from "@/db/schema/forks";
import { writeAuditEntry } from "@/lib/audit";
import { writeActivity } from "./activity";

/**
 * Fork-request repository — Elf's most mission-critical action (spec
 * section 3, UX expert): "Fork approval: impossible to accidentally
 * approve. Deliberate two-step confirmation required."
 *
 * The actual GitHub fork API call lives in TreasuryService-style
 * abstraction (lib/forks/execution.ts). This file is purely DB.
 */

export type CreateForkRequestInput = {
  workspaceId: string;
  projectId: string;
  requesterId: string;
  requesterNote?: string | null;
};

export async function createForkRequest(
  input: CreateForkRequestInput
): Promise<ForkRequest> {
  const [created] = await db
    .insert(forkRequests)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      requesterId: input.requesterId,
      requesterNote: input.requesterNote ?? null,
      status: "pending"
    })
    .returning();

  // Audit + activity hooks fire-and-forget, same fail-soft contract as
  // commit/project creation.
  void writeAuditEntry({
    workspaceId: created.workspaceId,
    projectId: created.projectId,
    type: "fork_requested",
    payload: {
      fork_id: created.id,
      requester_id: created.requesterId,
      requester_note: created.requesterNote
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[audit] fork_requested failed:", err);
  });

  void writeActivity({
    workspaceId: created.workspaceId,
    projectId: created.projectId,
    actorId: created.requesterId,
    type: "fork.requested",
    payload: { fork_id: created.id }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[activity] fork.requested failed:", err);
  });

  return created;
}

export async function findForkRequest(forkId: string): Promise<ForkRequest | null> {
  const [row] = await db
    .select()
    .from(forkRequests)
    .where(eq(forkRequests.id, forkId))
    .limit(1);
  return row ?? null;
}

export async function listForkRequests(opts: {
  workspaceId: string;
  status?: ForkStatus;
  limit?: number;
}): Promise<ForkRequest[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const where = opts.status
    ? and(
        eq(forkRequests.workspaceId, opts.workspaceId),
        eq(forkRequests.status, opts.status)
      )
    : eq(forkRequests.workspaceId, opts.workspaceId);
  return db
    .select()
    .from(forkRequests)
    .where(where)
    .orderBy(desc(forkRequests.createdAt))
    .limit(limit);
}

export async function listProjectForkRequests(
  projectId: string,
  limit = 30
): Promise<ForkRequest[]> {
  return db
    .select()
    .from(forkRequests)
    .where(eq(forkRequests.projectId, projectId))
    .orderBy(desc(forkRequests.createdAt))
    .limit(Math.min(limit, 100));
}

export async function listPendingFork(opts: {
  projectId: string;
  requesterId: string;
}): Promise<ForkRequest | null> {
  const [row] = await db
    .select()
    .from(forkRequests)
    .where(
      and(
        eq(forkRequests.projectId, opts.projectId),
        eq(forkRequests.requesterId, opts.requesterId),
        eq(forkRequests.status, "pending")
      )
    )
    .limit(1);
  return row ?? null;
}

export async function setForkReviewed(opts: {
  forkId: string;
  reviewerId: string;
  status: ForkStatus;
  reviewerNote?: string | null;
  keeperTaskId?: string | null;
  keeperStatus?: KeeperStatus | null;
}): Promise<ForkRequest | null> {
  const [updated] = await db
    .update(forkRequests)
    .set({
      reviewerId: opts.reviewerId,
      reviewerNote: opts.reviewerNote ?? null,
      status: opts.status,
      keeperTaskId: opts.keeperTaskId ?? null,
      keeperStatus: opts.keeperStatus ?? null,
      reviewedAt: new Date()
    })
    .where(eq(forkRequests.id, opts.forkId))
    .returning();
  return updated ?? null;
}

export async function setForkExecutionResult(opts: {
  forkId: string;
  keeperStatus: KeeperStatus;
  keeperTxHash?: string | null;
  githubForkUrl?: string | null;
}): Promise<ForkRequest | null> {
  const [updated] = await db
    .update(forkRequests)
    .set({
      keeperStatus: opts.keeperStatus,
      keeperTxHash: opts.keeperTxHash ?? null,
      githubForkUrl: opts.githubForkUrl ?? null
    })
    .where(eq(forkRequests.id, opts.forkId))
    .returning();
  return updated ?? null;
}

export type { ForkRequest, ForkStatus, KeeperStatus };
