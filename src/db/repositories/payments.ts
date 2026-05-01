import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  contributorPayments,
  type PaymentStatus
} from "@/db/schema/treasury";
import { getPrimaryWallet } from "./wallets";

export type ContributorPayment = typeof contributorPayments.$inferSelect;

export type PaymentMethod = "web3" | "stripe" | "none";

export interface PaymentCheckResult {
  method: PaymentMethod;
  walletId?: string;
  chainId?: number;
  address?: string;
  stripeCustId?: string;
  reason?: string;
}

export async function checkPaymentMethod(
  userId: string
): Promise<PaymentCheckResult> {
  // Check for verified Web3 wallet first
  const primaryWallet = await getPrimaryWallet(userId);
  if (primaryWallet && primaryWallet.verified) {
    return {
      method: "web3",
      walletId: primaryWallet.id,
      chainId: primaryWallet.chainId,
      address: primaryWallet.address
    };
  }

  // TODO: Check for Stripe account linked to user
  // For now, return none if no verified wallet
  return {
    method: "none",
    reason: "No verified wallet or Stripe account linked"
  };
}

export async function createPaymentRecord(
  input: {
    workspaceId: string;
    projectId: string;
    treasuryId: string;
    recipientId: string;
    amountUsdc: number;
  }
): Promise<ContributorPayment> {
  const [payment] = await db
    .insert(contributorPayments)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      treasuryId: input.treasuryId,
      recipientId: input.recipientId,
      amountUsdc: input.amountUsdc.toString(),
      status: "pending",
      createdAt: new Date()
    })
    .returning();

  return payment;
}

export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  metadata?: { txHash?: string; approvedBy?: string }
): Promise<ContributorPayment> {
  const updates: Record<string, unknown> = {
    status
  };

  if (metadata?.txHash) {
    updates.uniswapTxHash = metadata.txHash;
  }
  if (metadata?.approvedBy) {
    updates.approvedBy = metadata.approvedBy;
    updates.approvedAt = new Date();
  }

  const [updated] = await db
    .update(contributorPayments)
    .set(updates)
    .where(eq(contributorPayments.id, paymentId))
    .returning();

  return updated;
}

export async function listProjectPayments(
  projectId: string
): Promise<ContributorPayment[]> {
  return db
    .select()
    .from(contributorPayments)
    .where(eq(contributorPayments.projectId, projectId))
    .orderBy(contributorPayments.createdAt);
}
