import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  bigint,
  unique,
  check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { projects } from "./projects";
import { commits } from "./projects";

export const projectTreasuries = pgTable(
  "project_treasuries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    walletAddress: text("wallet_address").notNull(),
    chainId: integer("chain_id").notNull().default(8453),
    usdcBalance: numeric("usdc_balance", { precision: 20, scale: 6 }).default("0"),
    totalDisbursed: numeric("total_disbursed", { precision: 20, scale: 6 }).default("0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    uniqueProject: unique("project_treasuries_project_unique").on(t.projectId)
  })
);

export const paymentStatusValues = [
  "pending",
  "approved",
  "swapping",
  "settled",
  "failed"
] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

export const contributorPayments = pgTable(
  "contributor_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
    projectId: uuid("project_id").notNull().references(() => projects.id),
    treasuryId: uuid("treasury_id").notNull().references(() => projectTreasuries.id),
    recipientId: uuid("recipient_id").notNull().references(() => users.id),
    commitId: uuid("commit_id").references(() => commits.id),
    amountUsdc: numeric("amount_usdc", { precision: 20, scale: 6 }).notNull(),
    tokenOut: text("token_out").notNull().default("USDC"),
    tokenOutAddress: text("token_out_address"),
    swapRequired: boolean("swap_required").notNull().default(false),
    uniswapTxHash: text("uniswap_tx_hash"),
    keeperTaskId: text("keeper_task_id"),
    status: text("status").notNull().default("pending"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    statusCheck: check(
      "contributor_payments_status_check",
      sql`${t.status} in ('pending','approved','swapping','settled','failed')`
    )
  })
);

export const treasuryTxTypeValues = [
  "deposit",
  "payment",
  "swap",
  "agent_spend"
] as const;
export type TreasuryTxType = (typeof treasuryTxTypeValues)[number];

export const treasuryTransactions = pgTable(
  "treasury_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treasuryId: uuid("treasury_id").notNull().references(() => projectTreasuries.id),
    type: text("type").notNull(),
    fromAddress: text("from_address"),
    toAddress: text("to_address"),
    amountUsdc: numeric("amount_usdc", { precision: 20, scale: 6 }),
    tokenIn: text("token_in"),
    tokenOut: text("token_out"),
    txHash: text("tx_hash").unique(),
    blockNumber: bigint("block_number", { mode: "bigint" }),
    chainId: integer("chain_id"),
    initiatedBy: uuid("initiated_by").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    typeCheck: check(
      "treasury_transactions_type_check",
      sql`${t.type} in ('deposit','payment','swap','agent_spend')`
    )
  })
);

export type ProjectTreasury = typeof projectTreasuries.$inferSelect;
export type ContributorPayment = typeof contributorPayments.$inferSelect;
export type TreasuryTransaction = typeof treasuryTransactions.$inferSelect;
