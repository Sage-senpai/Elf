import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRoleValues = [
  "dev",
  "writer",
  "designer",
  "product-manager",
  "manager"
] as const;
export type UserRoleProfile = string;

export const userBenefitOverrideValues = ["standard", "max"] as const;
export type UserBenefitOverride = (typeof userBenefitOverrideValues)[number];

/**
 * `users` is owned by Better Auth (via drizzleAdapter).
 * Column names match Better Auth's defaults so no field mapping is needed:
 *   name, email, emailVerified, image, createdAt, updatedAt
 *
 * GitHub OAuth tokens live on the `accounts` table. Domain-specific extras
 * live here because they describe the Elf user profile, not an OAuth account.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").unique().notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    username: text("username"),
    usernameUpdatedAt: timestamp("username_updated_at", { withTimezone: true }),
    roleProfile: text("role_profile").notNull().default("viewer"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    benefitOverride: text("benefit_override").notNull().default("standard"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => ({
    usernameUnique: uniqueIndex("users_username_unique").on(t.username),
    usernameCheck: check(
      "users_username_check",
      sql`${t.username} is null or ${t.username} ~ '^[a-z0-9][a-z0-9_]{2,29}$'`
    ),
    roleProfileCheck: check(
      "users_role_profile_check",
      sql`${t.roleProfile} = 'viewer' or ${t.roleProfile} ~ '^(dev|writer|designer|product-manager|manager)(\\+(dev|writer|designer|product-manager|manager))?$'`
    ),
    benefitOverrideCheck: check(
      "users_benefit_override_check",
      sql`${t.benefitOverride} in ('standard','max')`
    )
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
