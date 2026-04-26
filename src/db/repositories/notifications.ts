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
