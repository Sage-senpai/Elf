import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { workspaces } from "./workspaces";
import { projects } from "./projects";

// 0G Storage Log local index — entries are content-addressed and append-only
export const zgAuditLog = pgTable("zg_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  projectId: uuid("project_id").references(() => projects.id),
  // 'commit' | 'fork_approval' | 'attachment' | 'payment' | 'agent_action'
  entryType: text("entry_type").notNull(),
  payload: jsonb("payload").notNull(),
  zgRootHash: text("zg_root_hash").unique().notNull(),
  zgTxHash: text("zg_tx_hash"),
  previousHash: text("previous_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

// Shelf Agent state — backed by 0G KV; this is the local index
export const shelfAgentState = pgTable(
  "shelf_agent_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastAction: text("last_action"),
    staleProjects: uuid("stale_projects").array().default(sql`'{}'::uuid[]`),
    zgStreamId: text("zg_stream_id"),
    zgKvKey: text("zg_kv_key"),
    agentWallet: text("agent_wallet"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    uniqueWorkspace: unique("shelf_agent_state_workspace_unique").on(t.workspaceId)
  })
);

export type ZgAuditEntry = typeof zgAuditLog.$inferSelect;
export type ShelfAgentState = typeof shelfAgentState.$inferSelect;
