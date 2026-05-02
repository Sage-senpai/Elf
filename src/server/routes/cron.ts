import { Hono } from "hono";
import { listProjectsWithGithub } from "@/db/repositories/projects";
import { syncGithubCommits } from "@/lib/github/sync";

/**
 * Cron entry points — pinged by Vercel Cron on a fixed schedule (see
 * vercel.json). All endpoints under /api/cron require either:
 *   - a Bearer token matching CRON_SECRET (for ad-hoc invocations), or
 *   - the `x-vercel-cron` request header (set automatically by Vercel
 *     when it dispatches a scheduled job)
 *
 * Both checks are performed here once in middleware so each cron handler
 * stays focused on its actual job.
 */

function isAuthorized(c: { req: { header: (name: string) => string | undefined } }): boolean {
  if (c.req.header("x-vercel-cron")) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = c.req.header("authorization");
  if (!auth) return false;
  const expected = `Bearer ${secret}`;
  return auth === expected;
}

export const cronRouter = new Hono()
  .use("*", async (c, next) => {
    if (!isAuthorized(c)) return c.json({ error: "unauthorized" }, 401);
    await next();
  })
  /**
   * Fan out a GitHub commit sync across every project with a linked repo.
   * Uses each project's owner as the auth principal — they were the user
   * who linked the repo, so their OAuth token is the natural one to use.
   *
   * Failures on individual projects don't abort the whole run; we collect
   * per-project results so the response surface lets you debug which
   * project's sync broke without staring at logs.
   */
  .on(["GET", "POST"], "/sync-github", async (c) => {
    const linked = await listProjectsWithGithub();
    const results: Array<{
      projectId: string;
      slug: string;
      repo: string;
      imported?: number;
      skipped?: number;
      error?: string;
    }> = [];

    for (const project of linked) {
      if (!project.githubRepo) continue;
      try {
        const r = await syncGithubCommits({
          workspaceId: project.workspaceId,
          projectId: project.id,
          authorId: project.ownerId,
          repo: project.githubRepo,
          userId: project.ownerId
        });
        results.push({
          projectId: project.id,
          slug: project.slug,
          repo: project.githubRepo,
          imported: r.imported,
          skipped: r.skipped
        });
      } catch (err) {
        results.push({
          projectId: project.id,
          slug: project.slug,
          repo: project.githubRepo,
          error: err instanceof Error ? err.message : "sync_failed"
        });
      }
    }

    const totalImported = results.reduce((n, r) => n + (r.imported ?? 0), 0);
    return c.json({
      ok: true,
      ranAt: new Date().toISOString(),
      projectsScanned: results.length,
      totalImported,
      results
    });
  });
