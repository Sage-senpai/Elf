import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  attachments,
  attachmentTypeValues,
  type Attachment,
  type AttachmentType
} from "@/db/schema/projects";
import { writeAuditEntry } from "@/lib/audit";
import { writeActivity } from "./activity";

/**
 * Attachments repository — the cross-functional surface of a project.
 * Where the commit log is the work history, attachments are the
 * "everything else": the brief, the deck, the Figma board, the original
 * idea doc, the partner contract. Writers and designers contribute here
 * without ever touching git.
 */

export type CreateAttachmentInput = {
  workspaceId: string;
  projectId: string;
  addedBy: string;
  type: AttachmentType;
  title: string;
  url?: string | null;
  storagePath?: string | null;
};

export async function createAttachment(
  input: CreateAttachmentInput
): Promise<Attachment> {
  const [created] = await db
    .insert(attachments)
    .values({
      projectId: input.projectId,
      addedBy: input.addedBy,
      type: input.type,
      title: input.title,
      url: input.url ?? null,
      storagePath: input.storagePath ?? null
    })
    .returning();

  void writeAuditEntry({
    workspaceId: input.workspaceId,
    projectId: created.projectId,
    type: "attachment_added",
    payload: {
      attachment_id: created.id,
      added_by: created.addedBy,
      type: created.type,
      title: created.title,
      url: created.url
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[audit] attachment_added entry failed:", err);
  });

  void writeActivity({
    workspaceId: input.workspaceId,
    projectId: created.projectId,
    actorId: created.addedBy,
    type: "attachment.added",
    payload: {
      attachment_id: created.id,
      type: created.type,
      title: created.title
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[activity] attachment.added failed:", err);
  });

  return created;
}

export async function listProjectAttachments(
  projectId: string,
  limit = 30
): Promise<Attachment[]> {
  return db
    .select()
    .from(attachments)
    .where(
      and(eq(attachments.projectId, projectId), isNull(attachments.deletedAt))
    )
    .orderBy(desc(attachments.createdAt))
    .limit(Math.min(limit, 100));
}

export async function softDeleteAttachment(
  projectId: string,
  attachmentId: string
): Promise<void> {
  await db
    .update(attachments)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(attachments.projectId, projectId)
      )
    );
}

export { attachmentTypeValues };
export type { Attachment, AttachmentType };
