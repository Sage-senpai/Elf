import "server-only";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db/client";
import { commits, attachments } from "@/db/schema/projects";
import {
  contributorPayments,
  treasuryTransactions
} from "@/db/schema/treasury";
import { createCommit } from "@/db/repositories/commits";
import { createAttachment } from "@/db/repositories/attachments";
import {
  createPayment,
  createTreasury,
  findTreasuryByProject,
  markPaymentSettled,
  recordTreasuryTransaction
} from "@/db/repositories/treasuries";

/**
 * One-shot demo seeder. Populates a project with realistic-looking
 * commits, notes, references, a treasury, and a small set of settled
 * payments — enough to make the project page, treasury page, and team
 * heatmap look populated for a video recording.
 *
 * Idempotent-ish: each invocation appends a fresh batch tagged with the
 * current timestamp, so re-running adds more activity rather than
 * blowing up. The treasury is created only on first run.
 *
 * Everything is attributed to the calling user — for a multi-author
 * heatmap, invite a few teammates first and run this from each account.
 */

type SeedInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  /** Pseudo-recipient address for "settled" payments. Defaults to a Base
   *  Sepolia faucet address so the data looks real on a block explorer. */
  recipientAddress?: `0x${string}`;
};

const FAKE_RECIPIENT: `0x${string}` =
  "0x000000000000000000000000000000000000dEaD";

const COMMITS = [
  {
    type: "feat",
    scope: "auth",
    summary: "GitHub OAuth sign-in lands.",
    body:
      "Devs sign in with their GitHub account; the access token is stored on the Better Auth account row and powers the repo picker."
  },
  {
    type: "feat",
    scope: "treasury",
    summary: "Project treasuries spin up on Base Sepolia.",
    body:
      "Each project gets a fresh wallet — or, opt in to use your own connected wallet for self-custody."
  },
  {
    type: "fix",
    scope: "cowork",
    summary: "Cowork now talks to Groq when a key is set.",
    body: "Free, fast, OpenAI-compatible streaming with full tool-use loop."
  },
  {
    type: "ref",
    scope: "providers",
    summary: "Provider interfaces sealed off from route handlers.",
    body:
      "Storage, Execution, Messaging, Payment, Inference — partner SDKs never leak past these."
  },
  {
    type: "perf",
    scope: "notifications",
    summary: "Notification poller backs off on failure.",
    body: "Was hammering /unread-count even when the network was clearly down."
  }
];

const NOTES = [
  {
    summary: "Brief from launch call: positioning is clarity, not features.",
    body:
      "Sarah said it best — \"if a tool needs an explanation, it's not a tool, it's a problem.\" Lean every page on the *one* sentence that matters and let the rest breathe."
  },
  {
    summary: "Designer feedback: tone the green down a hair on dark mode.",
    body:
      "The forest green is too saturated against the warm white in dark surfaces. Try the deep variant for body text, save forest for headings."
  },
  {
    summary: "Decision: skip the marketing site rewrite this sprint.",
    body:
      "We don't have the bandwidth and the current copy converts. Revisit after the launch when we have real testimonials to slot in."
  }
];

const REFERENCES: Array<{
  type: "figma" | "doc" | "deck" | "notion" | "link" | "pdf";
  title: string;
  url: string;
}> = [
  {
    type: "figma",
    title: "Onboarding wireframes v2",
    url: "https://www.figma.com/file/example/onboarding-v2"
  },
  {
    type: "doc",
    title: "Original idea doc — what is Elf?",
    url: "https://docs.google.com/document/d/example"
  },
  {
    type: "notion",
    title: "Launch checklist + comms plan",
    url: "https://notion.so/example/launch-checklist"
  },
  {
    type: "deck",
    title: "Investor narrative — round 1",
    url: "https://docs.google.com/presentation/d/example"
  }
];

const PAYMENTS = [
  { amountUsdc: 250, note: "Onboarding flow — design + content" },
  { amountUsdc: 180, note: "Cowork tool integration" },
  { amountUsdc: 420, note: "Treasury smart contract review" },
  { amountUsdc: 95, note: "Brand wordmark refresh" }
];

function fakeTxHash(seed: string): string {
  // Generates a stable-looking hex string — recognisable as demo data
  // because it always starts with `0xdemo…`.
  const base = "0xdemo";
  const filler = Buffer.from(seed)
    .toString("hex")
    .padEnd(60, "0")
    .slice(0, 60);
  return base + filler;
}

export type SeedResult = {
  commits: number;
  notes: number;
  attachments: number;
  payments: number;
  treasuryCreated: boolean;
};

export async function seedProjectDemo(input: SeedInput): Promise<SeedResult> {
  const { workspaceId, projectId, userId } = input;
  const recipient = input.recipientAddress ?? FAKE_RECIPIENT;

  let commitsCount = 0;
  for (const c of COMMITS) {
    await createCommit({
      workspaceId,
      projectId,
      authorId: userId,
      type: c.type as "feat" | "fix" | "ref" | "perf",
      summary: c.summary,
      scope: c.scope,
      body: c.body
    });
    commitsCount++;
  }

  let notesCount = 0;
  for (const n of NOTES) {
    await createCommit({
      workspaceId,
      projectId,
      authorId: userId,
      type: "content",
      summary: n.summary,
      body: n.body
    });
    notesCount++;
  }

  let attachmentsCount = 0;
  for (const a of REFERENCES) {
    await createAttachment({
      workspaceId,
      projectId,
      addedBy: userId,
      type: a.type,
      title: a.title,
      url: a.url
    });
    attachmentsCount++;
  }

  let treasuryCreated = false;
  let treasury = await findTreasuryByProject(projectId);
  if (!treasury) {
    treasury = await createTreasury({ workspaceId, projectId });
    treasuryCreated = true;
  }

  let paymentsCount = 0;
  for (const p of PAYMENTS) {
    const payment = await createPayment({
      workspaceId,
      projectId,
      treasuryId: treasury.id,
      recipientId: userId, // recipient as the seeding user — keeps FK clean
      amountUsdc: p.amountUsdc,
      tokenOut: "USDC",
      swapRequired: false,
      approvedBy: userId
    });
    const txHash = fakeTxHash(`${payment.id}-${p.amountUsdc}`);
    await markPaymentSettled(payment.id, txHash);
    await recordTreasuryTransaction({
      treasuryId: treasury.id,
      type: "payment",
      fromAddress: treasury.walletAddress,
      toAddress: recipient,
      amountUsdc: String(p.amountUsdc),
      tokenIn: "USDC",
      tokenOut: "USDC",
      txHash,
      chainId: treasury.chainId,
      initiatedBy: userId,
      notes: p.note
    });
    paymentsCount++;
  }

  // Add a single deposit-style transaction so the on-chain history list
  // doesn't read as just outbound payments.
  await recordTreasuryTransaction({
    treasuryId: treasury.id,
    type: "deposit",
    fromAddress: recipient,
    toAddress: treasury.walletAddress,
    amountUsdc: "1000",
    tokenIn: "USDC",
    tokenOut: "USDC",
    txHash: fakeTxHash(`${treasury.id}-deposit`),
    chainId: treasury.chainId,
    initiatedBy: userId,
    notes: "Initial demo deposit"
  });

  return {
    commits: commitsCount,
    notes: notesCount,
    attachments: attachmentsCount,
    payments: paymentsCount,
    treasuryCreated
  };
}

/* -------------------------------------------------------------------------- */
/*  Wipe                                                                       */
/* -------------------------------------------------------------------------- */

export type WipeResult = {
  commits: number;
  notes: number;
  attachments: number;
  payments: number;
  transactions: number;
};

/**
 * Best-effort cleanup of seeded content. Targets:
 *   - commits/notes whose summary matches one of the canned seed strings
 *   - attachments whose title matches one of the canned seed titles
 *   - contributor_payments + treasury_transactions whose tx_hash starts
 *     with the `0xdemo` sentinel
 *
 * Only acts on rows scoped to the given (workspaceId, projectId), so a
 * stray real commit with the same summary in a different project is
 * untouched. The treasury itself is preserved — managers may want to
 * keep using the wallet that was set up for the demo.
 */
export async function wipeProjectDemo(input: {
  workspaceId: string;
  projectId: string;
}): Promise<WipeResult> {
  const seedCommitSummaries = COMMITS.map((c) => c.summary);
  const seedNoteSummaries = NOTES.map((n) => n.summary);
  const allSummaries = [...seedCommitSummaries, ...seedNoteSummaries];
  const seedTitles = REFERENCES.map((a) => a.title);

  const deletedCommitRows = await db
    .delete(commits)
    .where(
      and(
        eq(commits.projectId, input.projectId),
        inArray(commits.summary, allSummaries)
      )
    )
    .returning({ id: commits.id, type: commits.type });

  const commitsDeleted = deletedCommitRows.filter(
    (r) => r.type !== "content" && r.type !== "docs"
  ).length;
  const notesDeleted = deletedCommitRows.length - commitsDeleted;

  const deletedAttachmentRows = await db
    .delete(attachments)
    .where(
      and(
        eq(attachments.projectId, input.projectId),
        inArray(attachments.title, seedTitles)
      )
    )
    .returning({ id: attachments.id });

  const treasury = await findTreasuryByProject(input.projectId);
  let paymentsDeleted = 0;
  let txsDeleted = 0;
  if (treasury) {
    const deletedPayments = await db
      .delete(contributorPayments)
      .where(
        and(
          eq(contributorPayments.treasuryId, treasury.id),
          like(contributorPayments.uniswapTxHash, "0xdemo%")
        )
      )
      .returning({ id: contributorPayments.id });
    paymentsDeleted = deletedPayments.length;

    const deletedTxs = await db
      .delete(treasuryTransactions)
      .where(
        and(
          eq(treasuryTransactions.treasuryId, treasury.id),
          like(treasuryTransactions.txHash, "0xdemo%")
        )
      )
      .returning({ id: treasuryTransactions.id });
    txsDeleted = deletedTxs.length;
  }

  return {
    commits: commitsDeleted,
    notes: notesDeleted,
    attachments: deletedAttachmentRows.length,
    payments: paymentsDeleted,
    transactions: txsDeleted
  };
}
