import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  workspaces,
  workspaceMembers,
  type Workspace,
  type Plan
} from "@/db/schema/workspaces";
import { generateUniqueCodename } from "@/lib/codename";
import { writeAuditEntry } from "@/lib/audit";

/**
 * Repository for workspace + membership reads/writes. Route handlers and
 * server components import these — never raw db.select calls.
 */

export type CreateWorkspaceInput = {
  ownerId: string;
  displayName: string;
  /** Optional GitHub org slug to associate at creation. */
  githubOrg?: string | null;
};

/**
 * Creates a workspace + the owner's `manager` membership row in one shot.
 * Generates a unique codename automatically. The owner is always set as a
 * manager of the workspace they create.
 */
export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<Workspace> {
  const codename = await generateUniqueCodename(async (c) => {
    const found = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.codename, c))
      .limit(1);
    return found.length === 0;
  });

  const [created] = await db
    .insert(workspaces)
    .values({
      codename,
      displayName: input.displayName,
      ownerId: input.ownerId,
      githubOrg: input.githubOrg ?? null
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: created.id,
    userId: input.ownerId,
    role: "manager",
    invitedBy: input.ownerId,
    joinedAt: new Date()
  });

  // Fire-and-forget audit entry. Failures here never block workspace
  // creation — see writeAuditEntry's fail-soft contract.
  void writeAuditEntry({
    workspaceId: created.id,
    type: "workspace_created",
    payload: {
      codename: created.codename,
      display_name: created.displayName,
      owner_id: created.ownerId,
      github_org: created.githubOrg
    }
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn("[audit] workspace_created entry failed:", err);
  });

  return created;
}

/**
 * All workspaces the user is a member of (active, not soft-deleted).
 * Sorted newest-first so the dashboard shows the latest workspace at top.
 */
export async function listWorkspacesForUser(userId: string): Promise<Workspace[]> {
  const rows = await db
    .select({ workspace: workspaces })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        isNull(workspaces.deletedAt)
      )
    )
    .orderBy(desc(workspaces.createdAt));

  return rows.map((r) => r.workspace);
}

/**
 * Lookup by codename (the URL-safe identifier — `swift-elf-041`).
 * Returns null when the codename doesn't exist or is soft-deleted.
 */
export async function findWorkspaceByCodename(
  codename: string
): Promise<Workspace | null> {
  const [row] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.codename, codename), isNull(workspaces.deletedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * Resolve the role a user holds on a workspace. Returns null when the user
 * isn't a member. Used by the auth middleware before any workspace-scoped
 * route touches data.
 */
export async function getUserRole(
  workspaceId: string,
  userId: string
): Promise<"manager" | "dev" | "content" | "viewer" | null> {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);
  return (row?.role as "manager" | "dev" | "content" | "viewer") ?? null;
}

export type { Workspace, Plan };
