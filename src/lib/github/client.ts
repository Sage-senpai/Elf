import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts } from "@/db/schema/auth";

/**
 * Tiny GitHub REST wrapper. We avoid @octokit/rest because it pulls in
 * an enormous dep tree we don't need for ~3 endpoints. Plain fetch with
 * typed response shells is enough for the hackathon's repo + commit
 * surfaces.
 *
 * Auth strategy:
 *   - getAccessTokenForUser() reads the OAuth access token Better Auth
 *     stored on the `accounts` row when the user signed in with GitHub
 *   - All requests use that token in the Authorization header
 *   - Falls back to unauthenticated requests (rate-limit-bound) when no
 *     token exists, so users who signed in via magic link only can still
 *     browse public repos
 */

const GH = "https://api.github.com";

export type GithubRepo = {
  id: number;
  full_name: string; // "owner/repo"
  name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  pushed_at: string | null;
  language: string | null;
  fork: boolean;
};

export type GithubCommit = {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string } | null;
  };
  author: { login: string; avatar_url: string } | null;
  html_url: string;
};

export async function getAccessTokenForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ accessToken: accounts.accessToken })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "github")))
    .orderBy(desc(accounts.updatedAt))
    .limit(1);
  return row?.accessToken ?? null;
}

async function gh<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "elf-app"
  };
  if (init.token) headers.authorization = `Bearer ${init.token}`;

  const res = await fetch(`${GH}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GithubError(res.status, `GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export class GithubError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "GithubError";
  }
}

/**
 * Repos accessible to the user. Covers personal repos and any org repos
 * the OAuth scope grants. Uses the affiliation filter to include both.
 */
export async function listAccessibleRepos(opts: {
  userId: string;
  perPage?: number;
}): Promise<GithubRepo[]> {
  const token = await getAccessTokenForUser(opts.userId);
  if (!token) {
    // Anonymous fallback: we'd need the user's github handle to call
    // /users/{user}/repos. Skip for now — surface a clear error.
    throw new GithubError(401, "GitHub access token missing — re-sign-in with GitHub.");
  }
  const perPage = Math.min(opts.perPage ?? 60, 100);
  return gh<GithubRepo[]>(
    `/user/repos?per_page=${perPage}&sort=pushed&affiliation=owner,collaborator,organization_member`,
    { token }
  );
}

/**
 * Recent commits on a repo's default branch. Used by the sync flow to
 * import existing history as Elf commits.
 */
export async function listRecentCommits(opts: {
  userId: string;
  repo: string; // 'owner/repo'
  branch?: string;
  perPage?: number;
}): Promise<GithubCommit[]> {
  const token = await getAccessTokenForUser(opts.userId);
  const perPage = Math.min(opts.perPage ?? 20, 100);
  const branchQ = opts.branch ? `&sha=${encodeURIComponent(opts.branch)}` : "";
  return gh<GithubCommit[]>(`/repos/${opts.repo}/commits?per_page=${perPage}${branchQ}`, {
    token
  });
}
