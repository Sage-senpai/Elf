import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { projects } from "./projects";

export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").references(() => projects.id),
  actorId: uuid("actor_id").references(() => users.id),
  type: text("type").notNull(),
  // event types: workspace.created, project.created, project.status_changed,
  //              commit.created, fork.requested, fork.approved, fork.rejected,
  //              member.invited, member.joined, cowork.session_started,
  //              attachment.added, payment.created, payment.settled, agent.action
  payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export type Activity = typeof activity.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
