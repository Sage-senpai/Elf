import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  invites,
  workspaceMembers,
  workspaces,
  type Invite,
  type Role
} from "@/db/schema/workspaces";
import { users } from "@/db/schema/users";

export type InviteWithInviter = Invite & {
  inviterName: string | null;
  workspaceCodename: string;
  workspaceDisplayName: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^@?[a-z0-9][a-z0-9_]{2,29}$/i;

/**
 * Resolve an "identifier" (email, @username, or username) to a user record.
 * For username matches we fall through to the user's email so the invite
 * row stays keyed on email — that means an invite sent before the user
 * signs up still works the moment they create an account with that email.
 */
export async function resolveInviteIdentifier(
  identifier: string
): Promise<{ email: string; userId: string | null; matchedBy: "email" | "username" } | null> {
  const raw = identifier.trim();
  if (!raw) return null;

  if (EMAIL_RE.test(raw)) {
    const email = raw.toLowerCase();
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return { email, userId: user?.id ?? null, matchedBy: "email" };
  }

  if (USERNAME_RE.test(raw)) {
    const handle = raw.replace(/^@/, "").toLowerCase();
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.username, handle))
      .limit(1);
    if (!user) return null;
    return { email: user.email, userId: user.id, matchedBy: "username" };
  }

  return null;
}

export type CreateInviteInput = {
  workspaceId: string;
  email: string;
  role: Role;
  invitedBy: string;
};

/**
 * Creates an invite if no pending one already exists for that email on the
 * workspace, otherwise refreshes the existing row's role + expiry. Idempotent
 * by design — a manager re-inviting the same email shouldn't fail.
 */
export async function createInvite(input: CreateInviteInput): Promise<Invite> {
  const existing = await db
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.workspaceId, input.workspaceId),
        eq(invites.email, input.email),
        isNull(invites.acceptedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [refreshed] = await db
      .update(invites)
      .set({
        role: input.role,
        invitedBy: input.invitedBy,
        expiresAt: sql`now() + interval '7 days'`
      })
      .where(eq(invites.id, existing[0].id))
      .returning();
    return refreshed;
  }

  const [created] = await db
    .insert(invites)
    .values({
      workspaceId: input.workspaceId,
      email: input.email,
      role: input.role,
      invitedBy: input.invitedBy
    })
    .returning();
  return created;
}

/** Pending invites (not accepted, not expired) for a workspace. */
export async function listPendingInvites(workspaceId: string) {
  return db
    .select({
      id: invites.id,
      email: invites.email,
      role: invites.role,
      token: invites.token,
      expiresAt: invites.expiresAt,
      createdAt: invites.createdAt,
      inviterName: users.name
    })
    .from(invites)
    .leftJoin(users, eq(users.id, invites.invitedBy))
    .where(
      and(
        eq(invites.workspaceId, workspaceId),
        isNull(invites.acceptedAt),
        sql`${invites.expiresAt} > now()`
      )
    )
    .orderBy(desc(invites.createdAt));
}

export async function revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
  await db
    .delete(invites)
    .where(and(eq(invites.id, inviteId), eq(invites.workspaceId, workspaceId)));
}

/**
 * Fetch an invite by token along with workspace metadata for the accept
 * page. Returns null when the token is unknown, accepted, or expired.
 */
export async function findInviteByToken(token: string): Promise<InviteWithInviter | null> {
  const [row] = await db
    .select({
      invite: invites,
      workspaceCodename: workspaces.codename,
      workspaceDisplayName: workspaces.displayName,
      inviterName: users.name
    })
    .from(invites)
    .innerJoin(workspaces, eq(workspaces.id, invites.workspaceId))
    .leftJoin(users, eq(users.id, invites.invitedBy))
    .where(
      and(
        eq(invites.token, token),
        isNull(invites.acceptedAt),
        sql`${invites.expiresAt} > now()`
      )
    )
    .limit(1);

  if (!row) return null;
  return {
    ...row.invite,
    inviterName: row.inviterName,
    workspaceCodename: row.workspaceCodename,
    workspaceDisplayName: row.workspaceDisplayName
  };
}

export type AcceptInviteResult =
  | { ok: true; workspaceCodename: string }
  | { ok: false; reason: "not_found" | "wrong_user" | "already_member" };

/**
 * Marks the invite accepted and adds the user to the workspace as the
 * invited role. Refuses if the signed-in user's email doesn't match the
 * invite — managers send invites *to* a specific identity, so the link
 * isn't transferable.
 */
export async function acceptInvite(input: {
  token: string;
  userId: string;
  userEmail: string;
}): Promise<AcceptInviteResult> {
  const invite = await findInviteByToken(input.token);
  if (!invite) return { ok: false, reason: "not_found" };

  if (invite.email.toLowerCase() !== input.userEmail.toLowerCase()) {
    return { ok: false, reason: "wrong_user" };
  }

  const [existingMember] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, invite.workspaceId),
        eq(workspaceMembers.userId, input.userId)
      )
    )
    .limit(1);

  if (existingMember) {
    // Still mark the invite accepted so the manager's pending list clears.
    await db
      .update(invites)
      .set({ acceptedAt: new Date() })
      .where(eq(invites.id, invite.id));
    return { ok: false, reason: "already_member" };
  }

  await db.insert(workspaceMembers).values({
    workspaceId: invite.workspaceId,
    userId: input.userId,
    role: invite.role,
    invitedBy: invite.invitedBy,
    joinedAt: new Date()
  });

  await db
    .update(invites)
    .set({ acceptedAt: new Date() })
    .where(eq(invites.id, invite.id));

  return { ok: true, workspaceCodename: invite.workspaceCodename };
}

/** All members of a workspace with their display info — for the team page. */
export async function listWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.joinedAt,
      name: users.name,
      email: users.email,
      image: users.image,
      username: users.username
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(desc(workspaceMembers.joinedAt));
}

