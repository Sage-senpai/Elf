import { Hono } from "hono";
import { z } from "zod";
import { isAddress } from "viem";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  ensureTreasury,
  getTreasuryForProject,
  getUsdcBalance,
  payContributor
} from "@/lib/treasury/service";
import {
  listPayments,
  listTreasuryTransactions
} from "@/db/repositories/treasuries";

/**
 * Mounted at /api/workspaces/:codename/projects/:slug/treasury
 *
 * Manager-only writes (create, pay). Anyone in the workspace can read.
 */

const PayBody = z.object({
  recipientAddress: z
    .string()
    .refine((s) => isAddress(s), "Must be a valid Ethereum address"),
  recipientUserId: z.string().uuid(),
  amountUsdc: z
    .number()
    .positive("Amount must be positive")
    .max(1_000_000, "Single payment capped at 1,000,000 USDC"),
  commitId: z.string().uuid().optional(),
  /** When omitted, sends raw USDC. Specify a token symbol + address to swap. */
  tokenOut: z.string().max(12).optional(),
  tokenOutAddress: z
    .string()
    .refine((s) => isAddress(s), "Must be a valid Ethereum address")
    .optional()
});

export const treasuryRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .get("/", async (c) => {
    const treasury = await getTreasuryForProject(c.var.project.id);
    return c.json({ treasury: stripPrivate(treasury) });
  })
  .post("/", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden", reason: "manager_only" }, 403);
    }
    // Optional body: { externalWalletAddress?: "0x..." } — when present, the
    // treasury is user-custodied (no server-stored private key, no auto-pay).
    let externalWalletAddress: `0x${string}` | undefined;
    try {
      const text = await c.req.text();
      if (text) {
        const parsed = JSON.parse(text);
        if (typeof parsed.externalWalletAddress === "string") {
          if (!isAddress(parsed.externalWalletAddress)) {
            return c.json({ error: "invalid_address" }, 400);
          }
          externalWalletAddress = parsed.externalWalletAddress as `0x${string}`;
        }
      }
    } catch {
      // No body or non-JSON — fall through to managed-wallet creation.
    }

    const treasury = await ensureTreasury({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id,
      externalWalletAddress: externalWalletAddress ?? null
    });
    return c.json({ treasury: stripPrivate(treasury) }, 201);
  })
  .get("/balance", async (c) => {
    const treasury = await getTreasuryForProject(c.var.project.id);
    if (!treasury) return c.json({ error: "no_treasury" }, 404);
    const balance = await getUsdcBalance(treasury);
    return c.json({
      balance: { ...balance, raw: balance.raw.toString() }
    });
  })
  .get("/payments", async (c) => {
    const treasury = await getTreasuryForProject(c.var.project.id);
    if (!treasury) return c.json({ payments: [] });
    const payments = await listPayments(treasury.id);
    return c.json({ payments });
  })
  .get("/transactions", async (c) => {
    const treasury = await getTreasuryForProject(c.var.project.id);
    if (!treasury) return c.json({ transactions: [] });
    const transactions = await listTreasuryTransactions(treasury.id);
    return c.json({ transactions });
  })
  .post("/pay", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden", reason: "manager_only" }, 403);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const parsed = PayBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }

    const treasury = await getTreasuryForProject(c.var.project.id);
    if (!treasury) return c.json({ error: "no_treasury" }, 404);

    try {
      const result = await payContributor({
        treasury,
        recipientAddress: parsed.data.recipientAddress as `0x${string}`,
        recipientUserId: parsed.data.recipientUserId,
        amountUsdc: parsed.data.amountUsdc,
        approvedBy: c.var.userId,
        workspaceId: c.var.workspace.id,
        projectId: c.var.project.id,
        commitId: parsed.data.commitId ?? null,
        tokenOut: parsed.data.tokenOut,
        tokenOutAddress: parsed.data.tokenOutAddress as `0x${string}` | undefined
      });
      return c.json({ payment: result.payment, txHash: result.txHash }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : "payment_failed";
      return c.json({ error: "payment_failed", message }, 500);
    }
  });

/** Never expose encrypted_private_key over the wire. */
function stripPrivate<T extends { encryptedPrivateKey?: string } | null>(
  t: T
): Omit<NonNullable<T>, "encryptedPrivateKey"> | null {
  if (!t) return null;
  const { encryptedPrivateKey: _hidden, ...rest } = t;
  return rest;
}
