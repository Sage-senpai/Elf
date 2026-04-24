import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  unique,
  check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const projectStatusValues = ["active", "wip", "concept", "archived"] as const;
export type ProjectStatus = (typeof projectStatusValues)[number];

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    niche: text("niche"),
    status: text("status").notNull().default("concept"),
    stack: text("stack").array().default(sql`'{}'::text[]`),
    tags: text("tags").array().default(sql`'{}'::text[]`),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    githubRepo: text("github_repo"),
    previewUrl: text("preview_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => ({
    uniqueSlug: unique("projects_workspace_slug_unique").on(t.workspaceId, t.slug),
    statusCheck: check(
      "projects_status_check",
      sql`${t.status} in ('active','wip','concept','archived')`
    )
  })
);

export const projectPermissions = pgTable(
  "project_permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: text("role").notNull(),
    setBy: uuid("set_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    uniqueOverride: unique("project_permissions_unique").on(t.projectId, t.userId),
    roleCheck: check(
      "project_permissions_role_check",
      sql`${t.role} in ('manager','dev','content','viewer')`
    )
  })
);

export const commitTypeValues = [
  "feat",
  "fix",
  "audit",
  "ref",
  "docs",
  "refactor",
  "chore",
  "perf",
  "content",
  "revert",
  "style"
] as const;
export type CommitType = (typeof commitTypeValues)[number];

export const commits = pgTable(
  "commits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
    authorId: uuid("author_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    scope: text("scope"),
    summary: text("summary").notNull(),
    body: text("body"),
    footer: text("footer"),
    githubSha: text("github_sha"),
    isBreaking: boolean("is_breaking").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    typeCheck: check(
      "commits_type_check",
      sql`${t.type} in ('feat','fix','audit','ref','docs','refactor','chore','perf','content','revert','style')`
    )
  })
);

export const attachmentTypeValues = [
  "link",
  "doc",
  "deck",
  "figma",
  "notion",
  "pdf",
  "other"
] as const;
export type AttachmentType = (typeof attachmentTypeValues)[number];

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    addedBy: uuid("added_by").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    storagePath: text("storage_path"),

    // v2 — provider + 0G refs
    storageProvider: text("storage_provider").default("supabase"),
    storageRef: text("storage_ref"),
    txHash: text("tx_hash"),
    gasUsed: text("gas_used"), // bigint stored as text to avoid JS number loss

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => ({
    typeCheck: check(
      "attachments_type_check",
      sql`${t.type} in ('link','doc','deck','figma','notion','pdf','other')`
    ),
    storageCheck: check(
      "attachments_storage_provider_check",
      sql`${t.storageProvider} in ('supabase','0g')`
    )
  })
);

export type Project = typeof projects.$inferSelect;
export type Commit = typeof commits.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type ProjectPermission = typeof projectPermissions.$inferSelect;
