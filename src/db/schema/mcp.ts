import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces } from "./workspaces";

// External MCP client API keys (Cursor, Claude Desktop, etc.)
export const mcpApiKeys = pgTable("mcp_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  // SHA-256 of the actual key — never store plaintext
  keyHash: text("key_hash").unique().notNull(),
  name: text("name").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true })
});

export type McpApiKey = typeof mcpApiKeys.$inferSelect;
