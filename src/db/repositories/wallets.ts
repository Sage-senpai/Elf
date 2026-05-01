import { eq, and, not } from "drizzle-orm";
import { db } from "@/db/client";
import { wallets, type Wallet, type NewWallet } from "@/db/schema/wallets";

export async function createWallet(input: {
  userId: string;
  chainId: number;
  address: string;
  label?: string;
}): Promise<Wallet> {
  const [wallet] = await db
    .insert(wallets)
    .values({
      userId: input.userId,
      chainId: input.chainId,
      address: input.address.toLowerCase(),
      label: input.label,
      verified: false,
      primaryWallet: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .returning();

  return wallet;
}

export async function getWalletById(
  walletId: string,
  userId: string
): Promise<Wallet | null> {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))
    .limit(1);

  return wallet ?? null;
}

export async function listUserWallets(userId: string): Promise<Wallet[]> {
  return db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .orderBy(wallets.createdAt);
}

export async function verifyWallet(
  walletId: string,
  userId: string
): Promise<Wallet> {
  const [updated] = await db
    .update(wallets)
    .set({
      verified: true,
      verifiedAt: new Date(),
      updatedAt: new Date()
    })
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))
    .returning();

  return updated;
}

export async function setPrimaryWallet(
  walletId: string,
  userId: string
): Promise<Wallet> {
  // First, unset all other primary wallets for this user
  await db
    .update(wallets)
    .set({ primaryWallet: false, updatedAt: new Date() })
    .where(
      and(eq(wallets.userId, userId), not(eq(wallets.id, walletId)))
    );

  // Then set this wallet as primary
  const [updated] = await db
    .update(wallets)
    .set({ primaryWallet: true, updatedAt: new Date() })
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))
    .returning();

  return updated;
}

export async function getPrimaryWallet(userId: string): Promise<Wallet | null> {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(
      and(eq(wallets.userId, userId), eq(wallets.primaryWallet, true))
    )
    .limit(1);

  return wallet ?? null;
}

export async function deleteWallet(
  walletId: string,
  userId: string
): Promise<boolean> {
  // Check wallet exists first
  const wallet = await getWalletById(walletId, userId);
  if (!wallet) {
    return false;
  }

  await db
    .delete(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)));

  return true;
}
