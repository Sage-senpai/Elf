import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * User crypto wallets for Web3 payments. Supports multiple chains and wallets per user.
 *
 * One user can have:
 * - Multiple wallets (MetaMask, Ledger, etc.)
 * - Multiple chains (Base, Ethereum, 0G, etc.)
 * - One "primary" wallet for default payment destination
 *
 * Verification happens via message signing (no gas fees).
 */
export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Chain ID: 1=Ethereum, 84532=Base Sepolia, 8453=Base mainnet, 16602=0G Galileo testnet
    chainId: integer("chain_id").notNull(),
    // Wallet address (lowercase, 0x-prefixed)
    address: text("address").notNull(),
    // User-provided label for this wallet
    label: text("label"),
    // Verified via signed message
    verified: boolean("verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    // Primary wallet used for payments when multiple exist
    primaryWallet: boolean("primary_wallet").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (t) => ({
    // One wallet per user per chain
    uniqueWallet: uniqueIndex("wallets_user_chain_address_unique").on(
      t.userId,
      t.chainId,
      t.address
    )
  })
);

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
