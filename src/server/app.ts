import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { health } from "./routes/health";
import { waitlist } from "./routes/waitlist";
import { authRouter } from "./routes/auth";
import { workspacesRouter } from "./routes/workspaces";
import { projectsRouter } from "./routes/projects";
import { commitsRouter } from "./routes/commits";
import { treasuryRouter } from "./routes/treasury";
import { coworkRouter } from "./routes/cowork";
import { githubRouter, projectGithubRouter } from "./routes/github";
import { agentRouter } from "./routes/agent";
import { projectForksRouter, workspaceForksRouter } from "./routes/forks";
import { notificationsRouter } from "./routes/notifications";
import { walletsRouter } from "./routes/wallets";
import { paymentsRouter } from "./routes/payments";
import {
  userInvitesRouter,
  workspaceInvitesRouter
} from "./routes/invites";
import { attachmentsRouter } from "./routes/attachments";
import { cronRouter } from "./routes/cron";
import { mcpServerRouter, workspaceMcpRouter } from "./routes/mcp";
import { permissionsRouter } from "./routes/permissions";
import { demoRouter } from "./routes/demo";

/**
 * Single Hono app instance, mounted under Next.js at /api/[[...route]].
 * Add new feature routers here as they're built.
 */
export const app = new Hono().basePath("/api");

app.use("*", logger());
app.use("*", cors());

app.route("/auth", authRouter);
app.route("/health", health);
app.route("/waitlist", waitlist);
app.route("/wallets", walletsRouter);
app.route("/workspaces", workspacesRouter);
app.route("/workspaces/:codename/projects", projectsRouter);
app.route("/workspaces/:codename/projects/:slug/commits", commitsRouter);
app.route("/workspaces/:codename/projects/:slug/treasury", treasuryRouter);
app.route("/workspaces/:codename/projects/:slug/cowork", coworkRouter);
app.route("/workspaces/:codename/projects/:slug/attachments", attachmentsRouter);
app.route("/workspaces/:codename/projects/:slug/payments", paymentsRouter);
app.route("/github", githubRouter);
app.route("/workspaces/:codename/projects/:slug/github", projectGithubRouter);
app.route("/workspaces/:codename/agent", agentRouter);
app.route("/workspaces/:codename/forks", workspaceForksRouter);
app.route("/workspaces/:codename/projects/:slug/forks", projectForksRouter);
app.route("/notifications", notificationsRouter);
app.route("/workspaces/:codename/invites", workspaceInvitesRouter);
app.route("/invites", userInvitesRouter);
app.route("/cron", cronRouter);
app.route("/workspaces/:codename/mcp-keys", workspaceMcpRouter);
app.route(
  "/workspaces/:codename/projects/:slug/permissions",
  permissionsRouter
);
app.route("/workspaces/:codename/projects/:slug/demo", demoRouter);
app.route("/mcp", mcpServerRouter);

app.notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404));

app.onError((err, c) => {
  console.error("[hono]", err);
  return c.json(
    { error: "internal_error", message: err.message },
    500
  );
});

export type AppType = typeof app;
