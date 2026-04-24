import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  unique,
  check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { projects } from "./projects";

export const coworkSessions = pgTable("cowork_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export const coworkMessageRoleValues = ["user", "assistant"] as const;

export const coworkMessages = pgTable(
  "cowork_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => coworkSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    tokensUsed: integer("tokens_used"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    roleCheck: check(
      "cowork_messages_role_check",
      sql`${t.role} in ('user','assistant')`
    )
  })
);

// v2 — AXL session tracking (one AXL session per cowork session)
export const axlSessionStatusValues = ["active", "closed"] as const;

export const axlSessions = pgTable(
  "axl_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    coworkSessionId: uuid("cowork_session_id")
      .notNull()
      .references(() => coworkSessions.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
    peerIdUser: text("peer_id_user").notNull(),
    peerIdClaude: text("peer_id_claude").notNull(),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true })
  },
  (t) => ({
    uniqueSession: unique("axl_sessions_cowork_unique").on(t.coworkSessionId),
    statusCheck: check(
      "axl_sessions_status_check",
      sql`${t.status} in ('active','closed')`
    )
  })
);

export type CoworkSession = typeof coworkSessions.$inferSelect;
export type CoworkMessage = typeof coworkMessages.$inferSelect;
export type AxlSession = typeof axlSessions.$inferSelect;
