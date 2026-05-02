import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  projects,
  type Project,
  type ProjectStatus
} from "@/db/schema/projects";
import { writeAuditEntry } from "@/lib/audit";
import { writeActivity } from "./activity";

/**
 * Repository for project reads/writes inside a workspace. Always scope by
 * workspaceId so a typo or stale param can't leak rows from another tenant.
 */

export type CreateProjectInput = {
  workspaceId: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string | null;
  niche?: string | null;
  status?: ProjectStatus;
  stack?: string[];
  tags?: string[];
  githubRepo?: string | null;
  previewUrl?: string | null;
};

/**
 * Insert a project. Slug uniqueness inside the workspace is enforced at the
 * DB level — we surface the conflict as a typed error so the route can
 * return 409 cleanly.
 */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  try {
    const [created] = await db
      .insert(projects)
      .values({
        workspaceId: input.workspaceId,
        ownerId: input.ownerId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        niche: input.niche ?? null,
        status: input.status ?? "concept",
        stack: input.stack ?? [],
        tags: input.tags ?? [],
        githubRepo: input.githubRepo ?? null,
        previewUrl: input.previewUrl ?? null
      })
      .returning();

    // Fire-and-forget audit entry — same fail-soft contract as workspace.
    void writeAuditEntry({
      workspaceId: created.workspaceId,
      projectId: created.id,
      type: "project_created",
      payload: {
        slug: created.slug,
        name: created.name,
        owner_id: created.ownerId,
        status: created.status,
        github_repo: created.githubRepo,
        stack: created.stack
      }
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[audit] project_created entry failed:", err);
    });

    void writeActivity({
      workspaceId: created.workspaceId,
      projectId: created.id,
      actorId: created.ownerId,
      type: "project.created",
      payload: { slug: created.slug, name: created.name, status: created.status }
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[activity] project.created failed:", err);
    });

    return created;
  } catch (err) {
    // Postgres unique-constraint violation (workspace_id, slug)
    if (err instanceof Error && /projects_workspace_slug_unique/.test(err.message)) {
      throw new SlugTakenError(input.slug);
    }
    throw err;
  }
}

export class SlugTakenError extends Error {
  constructor(public readonly slug: string) {
    super(`A project with slug "${slug}" already exists in this workspace.`);
    this.name = "SlugTakenError";
  }
}

/**
 * Active projects in a workspace, newest-first. Soft-deleted excluded.
 */
export async function listProjects(workspaceId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));
}

/**
 * Lookup a single project by its (workspace, slug) pair. Returns null when
 * not found or soft-deleted.
 */
export async function findProjectBySlug(
  workspaceId: string,
  slug: string
): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        eq(projects.slug, slug),
        isNull(projects.deletedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

/**
 * Every active project that has a linked GitHub repo. Used by the cron
 * scheduler to fan out auto-syncs across the whole platform.
 */
export async function listProjectsWithGithub(): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(
      and(isNull(projects.deletedAt), isNotNull(projects.githubRepo))
    )
    .orderBy(desc(projects.updatedAt));
}

/**
 * Link or unlink a GitHub repo on a project. Pass null to unlink.
 */
export async function setProjectGithubRepo(
  projectId: string,
  githubRepo: string | null
): Promise<Project | null> {
  const [updated] = await db
    .update(projects)
    .set({ githubRepo, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  return updated ?? null;
}

/**
 * Slugify a freeform project name into a URL-safe slug.
 *   "My First Project!"  ->  "my-first-project"
 * Caller is responsible for collision retries (append -2, -3, etc.).
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";
}

export type { Project, ProjectStatus };
