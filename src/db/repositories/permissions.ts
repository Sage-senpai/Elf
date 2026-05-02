import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  projectPermissions,
  type ProjectPermission
} from "@/db/schema/projects";
import {
  workspaceMembers,
  roleValues,
  type Role
} from "@/db/schema/workspaces";
import { users } from "@/db/schema/users";

/**
 * Project-permission overrides.
 *
 * Workspace-level role is the default ("dev" sees every dev surface across
 * the workspace). When a specific project needs different access — say a
 * dev who should only contribute to one client project, or a content
 * writer pulled in to draft for a single launch — the manager records
 * that override here.
 *
 * Effective role for a project = override role if present, else workspace
 * role. Resolution happens in [getEffectiveProjectRole].
 */

export type ProjectMemberRow = {
  userId: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  workspaceRole: Role;
  /** null when no override is set — effective role falls back to workspaceRole. */
  overrideRole: Role | null;
  /** What the user actually sees on this project right now. */
  effectiveRole: Role;
  setBy: string | null;
};

/**
 * Every workspace member, joined against any project-specific override.
 * Manager UI reads this to render the per-project membership grid.
 */
export async function listProjectMembers(
  workspaceId: string,
  projectId: string
): Promise<ProjectMemberRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      image: users.image,
      workspaceRole: workspaceMembers.role,
      overrideRole: projectPermissions.role,
      setBy: projectPermissions.setBy
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(
      projectPermissions,
      and(
        eq(projectPermissions.userId, workspaceMembers.userId),
        eq(projectPermissions.projectId, projectId)
      )
    )
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(desc(workspaceMembers.joinedAt));

  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    email: r.email,
    username: r.username,
    image: r.image,
    workspaceRole: r.workspaceRole as Role,
    overrideRole: (r.overrideRole as Role | null) ?? null,
    effectiveRole: ((r.overrideRole as Role | null) ?? r.workspaceRole) as Role,
    setBy: r.setBy
  }));
}

/**
 * Set or update a per-project role override for a user. Returns the new
 * permission row.
 */
export async function setProjectPermission(input: {
  projectId: string;
  userId: string;
  role: Role;
  setBy: string;
}): Promise<ProjectPermission> {
  const existing = await db
    .select()
    .from(projectPermissions)
    .where(
      and(
        eq(projectPermissions.projectId, input.projectId),
        eq(projectPermissions.userId, input.userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(projectPermissions)
      .set({ role: input.role, setBy: input.setBy })
      .where(eq(projectPermissions.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(projectPermissions)
    .values({
      projectId: input.projectId,
      userId: input.userId,
      role: input.role,
      setBy: input.setBy
    })
    .returning();
  return created;
}

/** Drop the override — user reverts to their workspace-level role. */
export async function clearProjectPermission(input: {
  projectId: string;
  userId: string;
}): Promise<void> {
  await db
    .delete(projectPermissions)
    .where(
      and(
        eq(projectPermissions.projectId, input.projectId),
        eq(projectPermissions.userId, input.userId)
      )
    );
}

export { roleValues };
export type { Role };
