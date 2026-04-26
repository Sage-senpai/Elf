import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { shelfAgentState } from "@/db/schema/zg";
import { listProjects } from "@/db/repositories/projects";
import { listProjectCommits } from "@/db/repositories/commits";
import { createNotification } from "@/db/repositories/notifications";
import { writeAuditEntry } from "@/lib/audit";
import { writeActivity } from "@/db/repositories/activity";
import { recordAgentRun } from "./contract";
import { pickAgentInferenceProvider } from "@/lib/providers/inference";

/**
 * Shelf Agent — the autonomous workspace monitor (spec section 15).
 *
 * Per run, for one workspace:
 *  1. Read agent state from Postgres mirror (last_run_at, stale list)
 *  2. Walk every active project, find ones whose latest commit is older
 *     than the configured threshold
 *  3. For each newly-stale project, send a notification to the project
 *     owner ("Quiz engine has been quiet for 8 days — want to drop a
 *     status update?")
 *  4. Write an agent_action audit entry (immutable, hash-chained)
 *  5. Anchor the run on 0G Chain via ShelfAgentStateManager.recordRun
 *  6. Update agent state row (last_run_at, last_action, stale list)
 *
 * Fail-soft like every other on-chain integration: any layer (audit,
 * on-chain, notifications) can throw and the rest still runs.
 */

export type ShelfAgentRunInput = {
  workspaceId: string;
  /** Notify owner if no commit in this many days. Default 7. */
  staleThresholdDays?: number;
  /** Triggered by? user id when run-now button, null when cron. */
  triggeredBy?: string | null;
};

export type ShelfAgentRunResult = {
  scanned: number;
  newlyStale: string[];          // project ids
  alreadyStale: string[];        // project ids previously flagged
  notificationsSent: number;
  auditRootHash: string | null;
  onChainTxHash: string | null;
  ranAt: Date;
};

export async function runShelfAgent(
  input: ShelfAgentRunInput
): Promise<ShelfAgentRunResult> {
  const thresholdDays = input.staleThresholdDays ?? 7;
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  const ranAt = new Date();

  // 1. Load (or create) the per-workspace agent state row.
  const state = await loadOrCreateState(input.workspaceId);
  const previouslyStale = new Set(state.staleProjects ?? []);

  // 2. Scan projects for staleness.
  const projects = await listProjects(input.workspaceId);
  const currentlyStale: Array<{ id: string; name: string; ownerId: string; lastSeen: Date | null }> = [];

  for (const project of projects) {
    if (project.status === "archived") continue;
    const commits = await listProjectCommits(project.id, 1);
    const lastCommitAt = commits[0]?.createdAt ?? null;
    const referenceTime = lastCommitAt ?? new Date(project.createdAt);
    if (referenceTime < cutoff) {
      currentlyStale.push({
        id: project.id,
        name: project.name,
        ownerId: project.ownerId,
        lastSeen: lastCommitAt ?? new Date(project.createdAt)
      });
    }
  }

  const newlyStale = currentlyStale.filter((p) => !previouslyStale.has(p.id));

  // 3. Notifications for newly-stale projects (don't re-spam the same
  //    owner). Body text is generated through the agent's inference
  //    provider — 0G Compute when SHELF_AGENT_USE_0G_COMPUTE=true and
  //    AGENT_WALLET_PRIVATE_KEY is set, Anthropic otherwise. Either
  //    failure path falls back to a deterministic template so the
  //    notification still lands.
  let notificationsSent = 0;
  for (const project of newlyStale) {
    const body = await draftStaleNudge({
      projectName: project.name,
      thresholdDays,
      lastSeen: project.lastSeen
    });
    try {
      await createNotification({
        userId: project.ownerId,
        workspaceId: input.workspaceId,
        type: "agent.stale_project",
        title: `${project.name} has been quiet for ${thresholdDays}+ days`,
        body,
        link: null
      });
      notificationsSent++;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[agent] notification failed:", err);
    }
  }

  // 4. Audit entry — full payload of what the agent did this run.
  const actionPayload = {
    ran_at: ranAt.toISOString(),
    threshold_days: thresholdDays,
    scanned: projects.length,
    newly_stale: newlyStale.map((p) => ({ id: p.id, name: p.name })),
    notifications_sent: notificationsSent,
    triggered_by: input.triggeredBy ?? null
  };
  let auditRootHash: string | null = null;
  try {
    const auditEntry = await writeAuditEntry({
      workspaceId: input.workspaceId,
      type: "agent_action",
      payload: actionPayload
    });
    auditRootHash = auditEntry.zgRootHash;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[agent] audit entry failed:", err);
  }

  // 5. Anchor on 0G Chain (no-op when SHELF_AGENT_CONTRACT_ADDRESS or
  //    AGENT_WALLET_PRIVATE_KEY is unset).
  const chain = await recordAgentRun({
    workspaceId: input.workspaceId,
    payload: actionPayload
  });

  // 6. Update the per-workspace state row.
  await db
    .update(shelfAgentState)
    .set({
      lastRunAt: ranAt,
      lastAction: chain ? `anchored:${chain.txHash}` : "ran",
      staleProjects: currentlyStale.map((p) => p.id),
      updatedAt: ranAt
    })
    .where(eq(shelfAgentState.workspaceId, input.workspaceId));

  // Activity feed — one row so humans see the agent worked.
  void writeActivity({
    workspaceId: input.workspaceId,
    type: "agent.action",
    payload: {
      note:
        notificationsSent === 0
          ? "checked workspace, nothing stale"
          : `flagged ${notificationsSent} stale project${
              notificationsSent === 1 ? "" : "s"
            }`,
      tx_hash: chain?.txHash ?? null
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[activity] agent.action failed:", err);
  });

  return {
    scanned: projects.length,
    newlyStale: newlyStale.map((p) => p.id),
    alreadyStale: currentlyStale
      .filter((p) => previouslyStale.has(p.id))
      .map((p) => p.id),
    notificationsSent,
    auditRootHash,
    onChainTxHash: chain?.txHash ?? null,
    ranAt
  };
}

/**
 * Generates the body of a stale-project nudge via the agent's inference
 * provider. Falls back to a hand-written template if inference is
 * unconfigured or fails — the notification always lands.
 */
async function draftStaleNudge(input: {
  projectName: string;
  thresholdDays: number;
  lastSeen: Date | null;
}): Promise<string> {
  const fallback =
    `The Shelf Agent noticed no commits or content updates on ` +
    `${input.projectName} in the last ${input.thresholdDays} days. ` +
    `Drop a quick status — even a chore commit clears the flag.`;

  if (!process.env.ANTHROPIC_API_KEY && (process.env.SHELF_AGENT_USE_0G_COMPUTE ?? "").toLowerCase() !== "true") {
    return fallback;
  }

  try {
    const provider = pickAgentInferenceProvider();
    const lastSeen = input.lastSeen
      ? input.lastSeen.toISOString().slice(0, 10)
      : "never";
    const result = await provider.generate({
      system:
        "You are an autonomous workspace monitor. Write ONE short, " +
        "warm, non-pushy sentence (max 220 chars) reminding the owner " +
        "their project has been quiet. No greetings, no signoff, no " +
        "emoji. Plain prose. Output the sentence only — no preamble.",
      messages: [
        {
          role: "user",
          content:
            `Project: ${input.projectName}\n` +
            `Days quiet (threshold): ${input.thresholdDays}\n` +
            `Last activity date: ${lastSeen}\n\n` +
            `Write the nudge.`
        }
      ],
      maxTokens: 200
    });
    const text = result.content.trim();
    return text.length > 0 ? text : fallback;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[agent] inference failed, using template nudge:", err);
    return fallback;
  }
}

async function loadOrCreateState(workspaceId: string) {
  const [existing] = await db
    .select()
    .from(shelfAgentState)
    .where(eq(shelfAgentState.workspaceId, workspaceId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(shelfAgentState)
    .values({ workspaceId })
    .returning();
  return created;
}

export async function getAgentStatus(workspaceId: string) {
  const [row] = await db
    .select()
    .from(shelfAgentState)
    .where(eq(shelfAgentState.workspaceId, workspaceId))
    .limit(1);
  return row ?? null;
}
