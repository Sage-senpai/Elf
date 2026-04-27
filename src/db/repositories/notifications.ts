import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { notifications, type Notification } from "@/db/schema/activity";

export type CreateNotificationInput = {
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput
): Promise<Notification> {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      workspaceId: input.workspaceId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null
    })
    .returning();
  return row;
}

/** Most-recent notifications for a user across all their workspaces. */
export async function listForUser(opts: {
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<Notification[]> {
  const limit = Math.min(opts.limit ?? 25, 100);
  const where = opts.unreadOnly
    ? and(eq(notifications.userId, opts.userId), eq(notifications.read, false))
    : eq(notifications.userId, opts.userId);
  return db
    .select()
    .from(notifications)
    .where(where)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function countUnread(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false))
    );
  return row?.count ?? 0;
}

/**
 * Verifies ownership before flipping the flag — even if a malicious user
 * passes someone else's notification id, the userId predicate prevents
 * cross-account writes.
 */
export async function markRead(opts: {
  notificationId: string;
  userId: string;
}): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, opts.notificationId),
        eq(notifications.userId, opts.userId)
      )
    );
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false))
    );
}
