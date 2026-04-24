import {
  pgTable,
  uuid,
  text,
  timestamp,
  customType
} from "drizzle-orm/pg-core";

// AES-256 encrypted github token, stored as bytea
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  }
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  githubHandle: text("github_handle"),
  githubToken: bytea("github_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
