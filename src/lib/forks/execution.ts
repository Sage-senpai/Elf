import "server-only";
import {
  setForkExecutionResult,
  setForkReviewed,
  type ForkRequest
} from "@/db/repositories/forks";
import { getExecutionProvider } from "@/lib/providers/execution";
import { getAccessTokenForUser } from "@/lib/github/client";
import { findProjectBySlug } from "@/db/repositories/projects";
import { db } from "@/db/client";
import { projects } from "@/db/schema/projects";
import { eq } from "drizzle-orm";
import { writeAuditEntry } from "@/lib/audit";
import { writeActivity } from "@/db/repositories/activity";
import { createNotification } from "@/db/repositories/notifications";

/**
 * Fork-approval execution.
 *
 * Spec section 13: when a manager approves a fork, the GitHub call runs
 * through a guaranteed-execution layer with retries, full audit trail,
 * and on-chain settlement. Today the ExecutionProvider factory returns
 * KeeperHubProvider when KEEPERHUB_API_KEY is set, else
 * ImmediateExecutionProvider — which runs the workflow steps inline so
 * the demo path works without the sponsor SDK.
 *
 * Critical UX rule (spec section 3): "Fork approval is the most critical
 * UX in the product. It must be impossible to accidentally approve."
 * The route enforces a deliberate two-step confirmation; this module
 * is the post-confirmation execution path.
 */

const execution = getExecutionProvider();

export type ApproveForkInput = {
  fork: ForkRequest;
  reviewerId: string;
  reviewerNote?: string | null;
};

export type ApproveForkResult = {
  fork: ForkRequest;
  taskId: string;
  status: "executing" | "settled" | "failed";
  githubForkUrl?: string;
  errorMessage?: string;
};

/**
 * Approve + execute. Returns immediately after kicking off execution —
 * the caller waits for `status` (executing/settled/failed) and shows
 * the result inline.
 *
 * For the immediate-mock provider, executions complete in milliseconds
 * (synchronous fetch). For real KeeperHub, this returns 'executing' and
 * the polling job updates it later.
 */
export async function approveAndExecuteFork(
  input: ApproveForkInput
): Promise<ApproveForkResult> {
  // 1. Look up the project so we know which GitHub repo to fork.
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.fork.projectId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!project) {
    throw new Error("Fork target project no longer exists.");
  }
  if (!project.githubRepo) {
    throw new Error(
      "Project isn't linked to a GitHub repo — link one before approving forks."
    );
  }

  // 2. Use the requester's GitHub OAuth token so the fork lands in
  //    THEIR namespace (not the manager's). Spec: contributors get a
  //    real personal copy they can hack on.
  const requesterToken = await getAccessTokenForUser(input.fork.requesterId);
  if (!requesterToken) {
    throw new Error(
      "Requester has no GitHub access token. They need to sign in with GitHub first."
    );
  }

  // 3. Mark approved synchronously so the audit trail reflects the
  //    decision even if the GitHub call fails downstream.
  const approved = await setForkReviewed({
    forkId: input.fork.id,
    reviewerId: input.reviewerId,
    status: "approved",
    reviewerNote: input.reviewerNote ?? null,
    keeperStatus: "executing"
  });
  if (!approved) throw new Error("Fork request vanished mid-flight.");

  // 4. Audit + activity for the approval itself (independent of exec).
  void writeAuditEntry({
    workspaceId: approved.workspaceId,
    projectId: approved.projectId,
    type: "fork_approved",
    payload: {
      fork_id: approved.id,
      requester_id: approved.requesterId,
      reviewer_id: input.reviewerId,
      project_repo: project.githubRepo
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[audit] fork_approved failed:", err);
  });

  void writeActivity({
    workspaceId: approved.workspaceId,
    projectId: approved.projectId,
    actorId: input.reviewerId,
    type: "fork.approved",
    payload: {
      fork_id: approved.id,
      project_name: project.name
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[activity] fork.approved failed:", err);
  });

  // 5. Build a one-step workflow: POST /repos/:owner/:repo/forks. The
  //    execution provider runs this either inline (mock) or through
  //    KeeperHub's guaranteed-delivery pipeline (real, when wired).
  const { workflowId } = await execution.createWorkflow({
    name: `elf-fork-${approved.id}`,
    trigger: "manual",
    steps: [
      {
        action: "http.post",
        url: `https://api.github.com/repos/${project.githubRepo}/forks`,
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${requesterToken}`,
          "x-github-api-version": "2022-11-28",
          "user-agent": "elf-app"
        },
        body: {}
      }
    ],
    retries: 3,
    backoff: "exponential"
  });

  const { taskId } = await execution.runWorkflow(workflowId);

  await setForkExecutionResult({
    forkId: approved.id,
    keeperStatus: "executing"
  });
  await db
    .update((await import("@/db/schema/forks")).forkRequests)
    .set({ keeperTaskId: taskId })
    .where(eq((await import("@/db/schema/forks")).forkRequests.id, approved.id));

  // 6. For the immediate provider, the task usually settles within ms;
  //    for KeeperHub this returns 'pending'/'executing' and the polling
  //    job updates it later. Either way, fetch the latest status now so
  //    the API response has something useful to surface.
  const status = await execution.getTaskStatus(taskId);

  if (status.status === "settled") {
    // The HTTP step's response isn't currently captured by the immediate
    // provider — we'd need to extend it for real fork URL extraction.
    // For now we set the URL to a deterministic GitHub fork URL based
    // on the requester's GitHub handle, fetched separately.
    const forkUrl = await guessRequesterForkUrl({
      requesterId: input.fork.requesterId,
      sourceRepo: project.githubRepo
    });
    await setForkExecutionResult({
      forkId: approved.id,
      keeperStatus: "settled",
      keeperTxHash: status.txHash ?? null,
      githubForkUrl: forkUrl
    });

    // Notify the requester their fork is ready.
    await createNotification({
      userId: approved.requesterId,
      workspaceId: approved.workspaceId,
      type: "fork.approved",
      title: `Fork approved: ${project.name}`,
      body: forkUrl
        ? `Your fork is ready. Open it on GitHub to start working.`
        : `Your fork is ready. Check your GitHub for the new repo.`,
      link: forkUrl ?? null
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[notify] fork.approved failed:", err);
    });

    return {
      fork: { ...approved, keeperStatus: "settled", githubForkUrl: forkUrl ?? null },
      taskId,
      status: "settled",
      githubForkUrl: forkUrl ?? undefined
    };
  }

  if (status.status === "failed") {
    await setForkExecutionResult({
      forkId: approved.id,
      keeperStatus: "failed"
    });
    return {
      fork: { ...approved, keeperStatus: "failed" },
      taskId,
      status: "failed",
      errorMessage: status.error
    };
  }

  return {
    fork: approved,
    taskId,
    status: "executing"
  };
}

export type RejectForkInput = {
  fork: ForkRequest;
  reviewerId: string;
  reviewerNote?: string | null;
};

export async function rejectFork(input: RejectForkInput): Promise<ForkRequest> {
  const updated = await setForkReviewed({
    forkId: input.fork.id,
    reviewerId: input.reviewerId,
    status: "rejected",
    reviewerNote: input.reviewerNote ?? null
  });
  if (!updated) throw new Error("Fork request vanished mid-flight.");

  void writeAuditEntry({
    workspaceId: updated.workspaceId,
    projectId: updated.projectId,
    type: "fork_rejected",
    payload: {
      fork_id: updated.id,
      reviewer_id: input.reviewerId,
      reviewer_note: input.reviewerNote
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[audit] fork_rejected failed:", err);
  });

  void writeActivity({
    workspaceId: updated.workspaceId,
    projectId: updated.projectId,
    actorId: input.reviewerId,
    type: "fork.rejected",
    payload: { fork_id: updated.id }
  }).catch(() => {});

  await createNotification({
    userId: updated.requesterId,
    workspaceId: updated.workspaceId,
    type: "fork.rejected",
    title: "Fork request rejected",
    body:
      input.reviewerNote ??
      "A workspace manager declined your fork request. Reach out for context.",
    link: null
  }).catch(() => {});

  return updated;
}

/**
 * Heuristic fork-URL guesser. The immediate execution provider doesn't
 * surface response bodies yet, so we infer the fork URL from the
 * requester's GitHub username + the source repo name. Works for the
 * default "fork into my own account" case (no organization specified),
 * which is what 95% of users do.
 *
 * For the real KeeperHub path we'd capture the actual API response body
 * which contains html_url directly.
 */
async function guessRequesterForkUrl(opts: {
  requesterId: string;
  sourceRepo: string;
}): Promise<string | null> {
  const token = await getAccessTokenForUser(opts.requesterId);
  if (!token) return null;
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "user-agent": "elf-app"
      }
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { login?: string };
    if (!json.login) return null;
    const repoName = opts.sourceRepo.split("/")[1] ?? opts.sourceRepo;
    return `https://github.com/${json.login}/${repoName}`;
  } catch {
    return null;
  }
}
