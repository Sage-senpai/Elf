import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  GithubError,
  listAccessibleRepos,
  listRecentCommits
} from "@/lib/github/client";
import { setProjectGithubRepo } from "@/db/repositories/projects";

/**
 * Mounted at:
 *   /api/github/repos                              GET — caller's accessible repos
 *   /api/workspaces/:codename/projects/:slug/github
 *     GET   — current link state + linked repo's recent commits
 *     POST  — set { repo: 'owner/name' } as the project's linked repo
 *     DELETE — unlink
 */

const ReposQuery = z.object({
  q: z.string().max(120).optional()
});

export const githubRouter = new Hono()
  .use("*", requireUser)
  .get("/repos", async (c) => {
    const queryParse = ReposQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
    if (!queryParse.success) {
      return c.json({ error: "validation", issues: queryParse.error.issues }, 400);
    }
    try {
      const repos = await listAccessibleRepos({ userId: c.var.userId });
      const filtered = queryParse.data.q
        ? repos.filter((r) =>
            r.full_name.toLowerCase().includes(queryParse.data.q!.toLowerCase())
          )
        : repos;
      return c.json({ repos: filtered });
    } catch (err) {
      if (err instanceof GithubError) {
        return c.json({ error: "github", status: err.status, message: err.message }, 502);
      }
      throw err;
    }
  });

const LinkBody = z.object({
  repo: z
    .string()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Use "owner/repo" form')
});

export const projectGithubRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .get("/", async (c) => {
    const linked = c.var.project.githubRepo;
    if (!linked) {
      return c.json({ linked: false });
    }
    try {
      const commits = await listRecentCommits({
        userId: c.var.userId,
        repo: linked,
        perPage: 10
      });
      return c.json({
        linked: true,
        repo: linked,
        commits
      });
    } catch (err) {
      if (err instanceof GithubError) {
        return c.json(
          {
            linked: true,
            repo: linked,
            error: err.message,
            commits: []
          },
          200
        );
      }
      throw err;
    }
  })
  .post("/", async (c) => {
    if (c.var.workspaceRole === "viewer" || c.var.workspaceRole === "content") {
      return c.json({ error: "forbidden", reason: "manager_or_dev_only" }, 403);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const parsed = LinkBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }
    const updated = await setProjectGithubRepo(c.var.project.id, parsed.data.repo);
    return c.json({ project: updated });
  })
  .delete("/", async (c) => {
    if (c.var.workspaceRole === "viewer" || c.var.workspaceRole === "content") {
      return c.json({ error: "forbidden", reason: "manager_or_dev_only" }, 403);
    }
    const updated = await setProjectGithubRepo(c.var.project.id, null);
    return c.json({ project: updated });
  });
