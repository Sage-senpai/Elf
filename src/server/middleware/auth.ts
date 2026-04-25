import type { MiddlewareHandler } from "hono";
import { auth } from "@/lib/auth";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
  }
}

/**
 * requireUser — short-circuits with 401 when there's no Better Auth session.
 * On success, populates c.var.userId / c.var.userEmail for downstream handlers.
 *
 * Compose this on every protected /api/* route. Authentication-optional
 * routes (landing-page waitlist, /api/health) skip it.
 */
export const requireUser: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("userId", session.user.id);
  c.set("userEmail", session.user.email);
  await next();
};
