import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  coworkSessions,
  coworkMessages,
  type CoworkSession,
  type CoworkMessage
} from "@/db/schema/cowork";

/**
 * Cowork repository. One session per (user, project) at a time is the
 * typical pattern — this repo provides the lookup so the route can
 * reuse an active session instead of creating a new one per message.
 */

export async function getOrCreateSession(input: {
  workspaceId: string;
  projectId: string;
  userId: string;
}): Promise<CoworkSession> {
  const [existing] = await db
    .select()
    .from(coworkSessions)
    .where(
      and(
        eq(coworkSessions.projectId, input.projectId),
        eq(coworkSessions.userId, input.userId)
      )
    )
    .orderBy(asc(coworkSessions.createdAt))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(coworkSessions)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      userId: input.userId
    })
    .returning();
  return created;
}

export async function listSessionMessages(sessionId: string): Promise<CoworkMessage[]> {
  return db
    .select()
    .from(coworkMessages)
    .where(eq(coworkMessages.sessionId, sessionId))
    .orderBy(asc(coworkMessages.createdAt));
}

export async function appendMessage(input: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  tokensUsed?: number;
}): Promise<CoworkMessage> {
  const [row] = await db
    .insert(coworkMessages)
    .values({
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      tokensUsed: input.tokensUsed ?? null
    })
    .returning();
  return row;
}
