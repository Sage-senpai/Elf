import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import {
  createWallet,
  getWalletById,
  listUserWallets,
  verifyWallet,
  setPrimaryWallet,
  deleteWallet
} from "@/db/repositories/wallets";

const LinkWalletBody = z.object({
  chainId: z.number().int().min(1),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address")
});

const VerifyWalletBody = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format")
});

/**
 * Mounted at /api/wallets
 *
 *   GET  /             List user's wallets
 *   POST /             Create unverified wallet (returns message to sign)
 *   POST /:id/verify   Verify wallet via signed message
 *   PATCH /:id/primary Set as primary payment wallet
 *   DELETE /:id        Remove wallet
 */
export const walletsRouter = new Hono()
  .use("*", requireUser)
  .get("/", async (c) => {
    const walletList = await listUserWallets(c.var.userId);
    return c.json({ wallets: walletList });
  })
  .post("/", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }

    const parsed = LinkWalletBody.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "validation", issues: parsed.error.issues },
        400
      );
    }

    try {
      const wallet = await createWallet({
        userId: c.var.userId,
        chainId: parsed.data.chainId,
        address: parsed.data.address
      });

      // Return wallet and message to sign for verification
      const messageToSign = [
        "Sign this message to verify wallet ownership.",
        "",
        `Wallet: ${wallet.address}`,
        `Chain: ${wallet.chainId}`,
        `Timestamp: ${Date.now()}`
      ].join("\n");

      return c.json({
        wallet: {
          id: wallet.id,
          address: wallet.address,
          chainId: wallet.chainId
        },
        messageToSign
      }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : "wallet_creation_failed";
      if (message.includes("unique")) {
        return c.json({
          error: "wallet_already_linked",
          reason: "This wallet is already linked to your account"
        }, 409);
      }
      return c.json({ error: "wallet_creation_failed" }, 500);
    }
  })
  .post("/:walletId/verify", async (c) => {
    const walletId = c.req.param("walletId");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }

    const parsed = VerifyWalletBody.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "validation", issues: parsed.error.issues },
        400
      );
    }

    // Get the wallet to verify
    const wallet = await getWalletById(walletId, c.var.userId);
    if (!wallet) {
      return c.json({ error: "wallet_not_found" }, 404);
    }

    try {
      // TODO: Verify signature using ethers.js or viem
      // For now, we'll mark it as verified on trust
      // In production, verify the signature matches the wallet address
      const verified = await verifyWallet(walletId, c.var.userId);

      return c.json({
        verified: true,
        wallet: {
          id: verified.id,
          address: verified.address,
          verified: verified.verified
        }
      });
    } catch (err) {
      return c.json({ error: "verification_failed" }, 500);
    }
  })
  .patch("/:walletId/primary", async (c) => {
    const walletId = c.req.param("walletId");

    try {
      const wallet = await getWalletById(walletId, c.var.userId);
      if (!wallet) {
        return c.json({ error: "wallet_not_found" }, 404);
      }

      if (!wallet.verified) {
        return c.json({
          error: "wallet_not_verified",
          reason: "Only verified wallets can be set as primary"
        }, 400);
      }

      const updated = await setPrimaryWallet(walletId, c.var.userId);
      return c.json({
        wallet: {
          id: updated.id,
          address: updated.address,
          primaryWallet: updated.primaryWallet
        }
      });
    } catch (err) {
      return c.json({ error: "update_failed" }, 500);
    }
  })
  .delete("/:walletId", async (c) => {
    const walletId = c.req.param("walletId");

    try {
      const deleted = await deleteWallet(walletId, c.var.userId);
      if (!deleted) {
        return c.json({ error: "wallet_not_found" }, 404);
      }

      return c.json({ deleted: true });
    } catch (err) {
      return c.json({ error: "delete_failed" }, 500);
    }
  });
