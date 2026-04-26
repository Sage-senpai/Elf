import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { health } from "./routes/health";
import { waitlist } from "./routes/waitlist";
import { authRouter } from "./routes/auth";
import { workspacesRouter } from "./routes/workspaces";
import { projectsRouter } from "./routes/projects";
import { commitsRouter } from "./routes/commits";

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
app.route("/workspaces", workspacesRouter);
app.route("/workspaces/:codename/projects", projectsRouter);
app.route("/workspaces/:codename/projects/:slug/commits", commitsRouter);

app.notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404));

app.onError((err, c) => {
  console.error("[hono]", err);
  return c.json(
    { error: "internal_error", message: err.message },
    500
  );
});

export type AppType = typeof app;
