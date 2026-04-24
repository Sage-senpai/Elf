import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  unique,
  check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

// Workspace plans
export const planValues = ["free", "builder", "studio", "enterprise"] as const;
export type Plan = (typeof planValues)[number];

// Storage providers (v2)
export const storageProviderValues = ["supabase", "0g"] as const;
export type StorageProviderKind = (typeof storageProviderValues)[number];

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codename: text("codename").unique().notNull(),
    displayName: text("display_name").notNull(),
    ownerId: uuid("owner_id").notNull().references(() => users.id),
    plan: text("plan").notNull().default("free"),
    githubOrg: text("github_org"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),

    // v2 — wallet + storage provider + treasury cache
    walletAddress: text("wallet_address"),
    walletProvider: text("wallet_provider").default("turnkey"),
    storageProvider: text("storage_provider").default("supabase"),
    treasuryBalanceUsdc: numeric("treasury_balance_usdc", {
      precision: 20,
      scale: 6
    }).default("0"),
    axlPeerId: text("axl_peer_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
  },
  (t) => ({
    planCheck: check("workspaces_plan_check", sql`${t.plan} in ('free','builder','studio','enterprise')`),
    storageCheck: check(
      "workspaces_storage_provider_check",
      sql`${t.storageProvider} in ('supabase','0g')`
    )
  })
);

// Roles
export const roleValues = ["manager", "dev", "content", "viewer"] as const;
export type Role = (typeof roleValues)[number];

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id),
    role: text("role").notNull().default("viewer"),
    invitedBy: uuid("invited_by").references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    uniqueMember: unique("workspace_members_unique").on(t.workspaceId, t.userId),
    roleCheck: check(
      "workspace_members_role_check",
      sql`${t.role} in ('manager','dev','content','viewer')`
    )
  })
);

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"),
  token: text("token")
    .notNull()
    .unique()
    .default(sql`encode(gen_random_bytes(32), 'hex')`),
  invitedBy: uuid("invited_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '7 days'`),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow()
});

export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type Invite = typeof invites.$inferSelect;
