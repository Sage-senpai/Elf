import "server-only";
import { listRecentCommits, type GithubCommit } from "./client";
import {
  createCommit,
  listProjectCommits
} from "@/db/repositories/commits";
import type { CommitType } from "@/db/schema/projects";

/**
 * Import recent GitHub commits into the project's Elf commit log.
 *
 * Strategy:
 *   - Fetch the last N commits from the linked repo's default branch
 *   - Skip any whose sha already exists in the project (idempotent)
 *   - Map the commit message header to an Elf type (best-effort regex
 *     against Conventional Commits prefixes; defaults to 'chore')
 *   - Insert in original order so the audit chain reads correctly
 *
 * Returns the number of new Elf commits created.
 */

export type SyncOptions = {
  workspaceId: string;
  projectId: string;
  authorId: string;
  repo: string; // 'owner/name'
  userId: string; // for the github access token lookup
  perPage?: number;
};

export async function syncGithubCommits(opts: SyncOptions): Promise<{
  imported: number;
  skipped: number;
  total: number;
}> {
  const ghCommits = await listRecentCommits({
    userId: opts.userId,
    repo: opts.repo,
    perPage: opts.perPage ?? 20
  });

  // Build a quick lookup of existing SHAs to avoid re-importing.
  const existing = await listProjectCommits(opts.projectId, 100);
  const seen = new Set(
    existing.map((c) => c.githubSha).filter((s): s is string => !!s)
  );

  // GitHub returns newest-first; reverse so we insert oldest-first and
  // the audit-log chain ends up in the same order as git's history.
  const newest = ghCommits.filter((c) => !seen.has(c.sha));
  const ordered = [...newest].reverse();

  let imported = 0;
  for (const gh of ordered) {
    const { type, scope, summary, body } = parseCommitMessage(gh.commit.message);
    await createCommit({
      workspaceId: opts.workspaceId,
      projectId: opts.projectId,
      authorId: opts.authorId,
      type,
      scope,
      summary,
      body,
      githubSha: gh.sha,
      isBreaking: detectBreaking(gh.commit.message)
    });
    imported++;
  }

  return {
    imported,
    skipped: ghCommits.length - imported,
    total: ghCommits.length
  };
}

const VALID_TYPES = new Set<CommitType>([
  "feat",
  "fix",
  "audit",
  "ref",
  "docs",
  "refactor",
  "chore",
  "perf",
  "content",
  "revert",
  "style"
]);

/**
 * Conventional Commits-ish parser. Recognises:
 *   type: summary
 *   type(scope): summary
 *   type!: summary    (breaking — the '!' is also caught by detectBreaking)
 *
 * Falls back to type='chore', summary=first line when nothing matches.
 */
function parseCommitMessage(message: string): {
  type: CommitType;
  scope: string | null;
  summary: string;
  body: string | null;
} {
  const [headerLine, ...rest] = message.split("\n");
  const header = headerLine?.trim() ?? "";
  const body = rest.join("\n").trim() || null;

  const m = header.match(/^(\w+)(?:\(([^)]+)\))?(!?):\s*(.+)$/);
  if (m) {
    const [, rawType, rawScope, , summary] = m;
    const candidate = rawType.toLowerCase() as CommitType;
    if (VALID_TYPES.has(candidate)) {
      return {
        type: candidate,
        scope: rawScope ?? null,
        summary: summary.slice(0, 72),
        body
      };
    }
  }
  return {
    type: "chore",
    scope: null,
    summary: header.slice(0, 72) || "(no message)",
    body
  };
}

function detectBreaking(message: string): boolean {
  return /^[a-z]+(?:\([^)]+\))?!:/m.test(message) || /BREAKING CHANGE:/.test(message);
}

export type { GithubCommit };
