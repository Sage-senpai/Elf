import { Hono } from "hono";
import { auth } from "@/lib/auth";

/**
 * Better Auth's request handler is a Web-standard fetch handler, so we just
 * hand it the raw Request from Hono's context. Covers every Better Auth
 * endpoint under /api/auth/* (sign-in, callback, sign-out, magic-link, etc.).
 */
export const authRouter = new Hono().all("/*", (c) => auth.handler(c.req.raw));
