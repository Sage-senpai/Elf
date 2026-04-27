import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import {
  countUnread,
  listForUser,
  markAllRead,
  markRead
} from "@/db/repositories/notifications";

/**
 * Mounted at /api/notifications — global to the user, not workspace-scoped,
 * so the bell drawer can show everything across every workspace they're in.
 *
 *   GET    /                 list (most recent first; ?unread=1 to filter)
 *   GET    /unread-count     just the integer
 *   PATCH  /:id/read         mark one as read
 *   POST   /read-all         mark every unread as read
 */

const ListQuery = z.object({
  unread: z
    .string()
    .optional()
    .transform((s) => s === "1" || s === "true"),
  limit: z
    .string()
    .optional()
    .transform((s) => (s ? Math.min(Math.max(Number(s), 1), 100) : 25))
});

export const notificationsRouter = new Hono()
  .use("*", requireUser)
  .get("/", async (c) => {
    const parsed = ListQuery.safeParse(
      Object.fromEntries(new URL(c.req.url).searchParams)
    );
    const opts = parsed.success ? parsed.data : { unread: false, limit: 25 };
    const list = await listForUser({
      userId: c.var.userId,
      limit: opts.limit,
      unreadOnly: opts.unread
    });
    return c.json({ notifications: list });
  })
  .get("/unread-count", async (c) => {
    const count = await countUnread(c.var.userId);
    return c.json({ count });
  })
  .patch("/:id/read", async (c) => {
    await markRead({
      notificationId: c.req.param("id"),
      userId: c.var.userId
    });
    return c.json({ ok: true });
  })
  .post("/read-all", async (c) => {
    await markAllRead(c.var.userId);
    return c.json({ ok: true });
  });
