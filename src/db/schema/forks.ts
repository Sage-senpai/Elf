import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { projects } from "./projects";

export const forkStatusValues = ["pending", "approved", "rejected"] as const;
export type ForkStatus = (typeof forkStatusValues)[number];

export const keeperStatusValues = [
  "pending",
  "executing",
  "settled",
  "failed"
] as const;
export type KeeperStatus = (typeof keeperStatusValues)[number];

export const forkRequests = pgTable(
  "fork_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
    requesterId: uuid("requester_id").notNull().references(() => users.id),
    reviewerId: uuid("reviewer_id").references(() => users.id),
    status: text("status").notNull().default("pending"),
    requesterNote: text("requester_note"),
    reviewerNote: text("reviewer_note"),
    githubForkUrl: text("github_fork_url"),

    // v2 — KeeperHub execution tracking
    keeperTaskId: text("keeper_task_id"),
    keeperStatus: text("keeper_status"),
    keeperTxHash: text("keeper_tx_hash"),
    keeperRetries: integer("keeper_retries").default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
  },
  (t) => ({
    statusCheck: check(
      "fork_requests_status_check",
      sql`${t.status} in ('pending','approved','rejected')`
    ),
    keeperCheck: check(
      "fork_requests_keeper_status_check",
      sql`${t.keeperStatus} is null or ${t.keeperStatus} in ('pending','executing','settled','failed')`
    )
  })
);

export type ForkRequest = typeof forkRequests.$inferSelect;
