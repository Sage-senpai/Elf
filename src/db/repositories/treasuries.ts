import { and, desc, eq } from "drizzle-orm";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { db } from "@/db/client";
import {
  projectTreasuries,
  contributorPayments,
  treasuryTransactions,
  type ProjectTreasury,
  type ContributorPayment,
  type TreasuryTransaction
} from "@/db/schema/treasury";
import { encryptSecret } from "@/lib/crypto";

/**
 * Treasury repository.
 *
 * Custodial-by-design: each project gets a fresh EOA on creation. The
 * private key is AES-256-GCM encrypted at rest under ENCRYPTION_KEY and
 * only decrypted server-side at signing time inside TreasuryService.
 *
 * Why custody? The pitch promises "agents that earn, swap, and pay —
 * without a human touching a wallet." The Shelf Agent needs to act
 * autonomously, which means the platform has to hold the keys.
 */

const DEFAULT_CHAIN_ID = Number(process.env.UNISWAP_CHAIN_ID ?? 84532);

export type CreateTreasuryInput = {
  workspaceId: string;
  projectId: string;
};

export async function createTreasury(
  input: CreateTreasuryInput
): Promise<ProjectTreasury> {
  // Fresh hex key — viem's generatePrivateKey returns 0x-prefixed 32 bytes.
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const [created] = await db
    .insert(projectTreasuries)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      walletAddress: account.address,
      encryptedPrivateKey: encryptSecret(privateKey),
      chainId: DEFAULT_CHAIN_ID
    })
    .returning();

  return created;
}

export async function findTreasuryByProject(
  projectId: string
): Promise<ProjectTreasury | null> {
  const [row] = await db
    .select()
    .from(projectTreasuries)
    .where(eq(projectTreasuries.projectId, projectId))
    .limit(1);
  return row ?? null;
}

export async function updateTreasuryBalance(
  treasuryId: string,
  usdcBalance: string
): Promise<void> {
  await db
    .update(projectTreasuries)
    .set({ usdcBalance, updatedAt: new Date() })
    .where(eq(projectTreasuries.id, treasuryId));
}

/* -------------------------------------------------------------------------- */
/*  Payments                                                                  */
/* -------------------------------------------------------------------------- */

export type CreatePaymentInput = {
  workspaceId: string;
  projectId: string;
  treasuryId: string;
  recipientId: string;
  commitId?: string | null;
  amountUsdc: number;
  tokenOut: string; // 'USDC' or a symbol
  tokenOutAddress?: string | null;
  swapRequired: boolean;
  approvedBy: string;
};

export async function createPayment(
  input: CreatePaymentInput
): Promise<ContributorPayment> {
  const [created] = await db
    .insert(contributorPayments)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      treasuryId: input.treasuryId,
      recipientId: input.recipientId,
      commitId: input.commitId ?? null,
      amountUsdc: String(input.amountUsdc),
      tokenOut: input.tokenOut,
      tokenOutAddress: input.tokenOutAddress ?? null,
      swapRequired: input.swapRequired,
      status: "approved",
      approvedBy: input.approvedBy,
      approvedAt: new Date()
    })
    .returning();
  return created;
}

export async function markPaymentSettled(
  paymentId: string,
  txHash: string
): Promise<void> {
  await db
    .update(contributorPayments)
    .set({
      status: "settled",
      uniswapTxHash: txHash,
      settledAt: new Date()
    })
    .where(eq(contributorPayments.id, paymentId));
}

export async function markPaymentFailed(paymentId: string): Promise<void> {
  await db
    .update(contributorPayments)
    .set({ status: "failed" })
    .where(eq(contributorPayments.id, paymentId));
}

export async function listPayments(
  treasuryId: string,
  limit = 30
): Promise<ContributorPayment[]> {
  return db
    .select()
    .from(contributorPayments)
    .where(eq(contributorPayments.treasuryId, treasuryId))
    .orderBy(desc(contributorPayments.createdAt))
    .limit(Math.min(limit, 100));
}

/* -------------------------------------------------------------------------- */
/*  Transaction history                                                       */
/* -------------------------------------------------------------------------- */

export async function recordTreasuryTransaction(input: {
  treasuryId: string;
  type: "deposit" | "payment" | "swap" | "agent_spend";
  fromAddress?: string | null;
  toAddress?: string | null;
  amountUsdc?: string | null;
  tokenIn?: string | null;
  tokenOut?: string | null;
  txHash?: string | null;
  chainId?: number | null;
  initiatedBy?: string | null;
  notes?: string | null;
}): Promise<TreasuryTransaction> {
  const [row] = await db
    .insert(treasuryTransactions)
    .values({
      treasuryId: input.treasuryId,
      type: input.type,
      fromAddress: input.fromAddress ?? null,
      toAddress: input.toAddress ?? null,
      amountUsdc: input.amountUsdc ?? null,
      tokenIn: input.tokenIn ?? null,
      tokenOut: input.tokenOut ?? null,
      txHash: input.txHash ?? null,
      chainId: input.chainId ?? null,
      initiatedBy: input.initiatedBy ?? null,
      notes: input.notes ?? null
    })
    .returning();
  return row;
}

export async function listTreasuryTransactions(
  treasuryId: string,
  limit = 30
): Promise<TreasuryTransaction[]> {
  return db
    .select()
    .from(treasuryTransactions)
    .where(eq(treasuryTransactions.treasuryId, treasuryId))
    .orderBy(desc(treasuryTransactions.createdAt))
    .limit(Math.min(limit, 100));
}

export type {
  ProjectTreasury,
  ContributorPayment,
  TreasuryTransaction
};
