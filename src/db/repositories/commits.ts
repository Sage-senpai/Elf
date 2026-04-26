import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  commits,
  type Commit,
  type CommitType,
  commitTypeValues
} from "@/db/schema/projects";
import { writeAuditEntry } from "@/lib/audit";

/**
 * Commit repository — Elf's commit log lives in Postgres and mirrors to
 * 0G Storage Log via the audit hook. The 11 type taxonomy is enforced at
 * the column-check level (see schema/projects.ts) and exported here as
 * `commitTypeValues` for forms and Zod parsers.
 */

export type CreateCommitInput = {
  workspaceId: string;
  projectId: string;
  authorId: string;
  type: CommitType;
  summary: string;
  scope?: string | null;
  body?: string | null;
  footer?: string | null;
  githubSha?: string | null;
  isBreaking?: boolean;
};

/**
 * Insert a commit. Like project creation, this fire-and-forgets an audit
 * entry — failures log but never block the user's commit landing.
 */
export async function createCommit(input: CreateCommitInput): Promise<Commit> {
  const [created] = await db
    .insert(commits)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      authorId: input.authorId,
      type: input.type,
      summary: input.summary,
      scope: input.scope ?? null,
      body: input.body ?? null,
      footer: input.footer ?? null,
      githubSha: input.githubSha ?? null,
      isBreaking: input.isBreaking ?? false
    })
    .returning();

  void writeAuditEntry({
    workspaceId: created.workspaceId,
    projectId: created.projectId,
    type: "commit_created",
    payload: {
      commit_id: created.id,
      author_id: created.authorId,
      type: created.type,
      scope: created.scope,
      summary: created.summary,
      is_breaking: created.isBreaking,
      github_sha: created.githubSha
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[audit] commit_created entry failed:", err);
  });

  return created;
}

/**
 * Project commits, newest first. Caller can limit; we cap at 100 to keep
 * the project detail page responsive even on chatty repos.
 */
export async function listProjectCommits(
  projectId: string,
  limit = 30
): Promise<Commit[]> {
  return db
    .select()
    .from(commits)
    .where(eq(commits.projectId, projectId))
    .orderBy(desc(commits.createdAt))
    .limit(Math.min(limit, 100));
}

/**
 * Workspace-wide commit feed. Powers the activity feed's commit slice
 * and the dashboard "recent across workspaces" surfacing later.
 */
export async function listWorkspaceCommits(
  workspaceId: string,
  limit = 30
): Promise<Commit[]> {
  return db
    .select()
    .from(commits)
    .where(eq(commits.workspaceId, workspaceId))
    .orderBy(desc(commits.createdAt))
    .limit(Math.min(limit, 100));
}

export { commitTypeValues };
export type { Commit, CommitType };
