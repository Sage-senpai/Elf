import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * `users` is owned by Better Auth (via drizzleAdapter, usePlural: true).
 * Column names match Better Auth's defaults so no field mapping is needed:
 *   name, email, emailVerified, image, createdAt, updatedAt
 *
 * GitHub OAuth tokens live on the `accounts` table — never duplicate them
 * here. Domain-specific extras (deletedAt for soft delete) are kept inline.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
