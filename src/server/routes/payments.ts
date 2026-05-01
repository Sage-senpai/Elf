import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  checkPaymentMethod,
  createPaymentRecord,
  updatePaymentStatus
} from "@/db/repositories/payments";
import { findTreasuryByProject } from "@/db/repositories/treasuries";

const PayContributorBody = z.object({
  recipientId: z.string().uuid("Invalid user ID"),
  amountUsdc: z.number().min(0.01, "Amount must be at least 0.01 USDC")
});

/**
 * Mounted at /api/workspaces/:codename/projects/:slug/payments
 *
 *   POST /contributor  Pay a contributor (Web3 wallet first, Stripe fallback)
 */
export const paymentsRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .post("/contributor", async (c) => {
    // Only managers can authorize payments
    if (c.var.workspaceRole !== "manager") {
      return c.json({
        error: "forbidden",
        reason: "Only managers can authorize payments"
      }, 403);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }

    const parsed = PayContributorBody.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "validation", issues: parsed.error.issues },
        400
      );
    }

    try {
      // Get project treasury
      const treasury = await findTreasuryByProject(c.var.project.id);
      if (!treasury) {
        return c.json({
          error: "no_treasury",
          reason: "Project does not have a treasury yet"
        }, 400);
      }

      // Check what payment method the contributor has
      const paymentMethod = await checkPaymentMethod(parsed.data.recipientId);

      if (paymentMethod.method === "none") {
        return c.json({
          error: "no_payment_method",
          reason:
            "Contributor has no verified wallet or Stripe account linked"
        }, 400);
      }

      // Create payment record
      const payment = await createPaymentRecord({
        workspaceId: c.var.workspace.id,
        projectId: c.var.project.id,
        treasuryId: treasury.id,
        recipientId: parsed.data.recipientId,
        amountUsdc: parsed.data.amountUsdc
      });

      // TODO: In production, actually send the payment:
      // - If Web3: Call Uniswap API to swap treasury funds to USDC, then send to wallet
      // - If Stripe: Create a payout via Stripe API
      // - Update payment status to "approved" → "swapping" → "settled"

      // For now, mark as approved (awaiting execution)
      const updated = await updatePaymentStatus(payment.id, "approved", {
        approvedBy: c.var.userId
      });

      return c.json({
        payment: {
          id: updated.id,
          amountUsdc: parseFloat(updated.amountUsdc as string),
          status: updated.status,
          createdAt: updated.createdAt
        }
      }, 201);
    } catch (err) {
      const message = err instanceof Error ? err.message : "payment_failed";
      return c.json({ error: "payment_failed", reason: message }, 500);
    }
  });
