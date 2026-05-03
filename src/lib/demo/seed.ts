import "server-only";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { commits, attachments } from "@/db/schema/projects";
import { workspaceMembers } from "@/db/schema/workspaces";
import {
  contributorPayments,
  treasuryTransactions
} from "@/db/schema/treasury";
import {
  createTreasury,
  findTreasuryByProject
} from "@/db/repositories/treasuries";

/**
 * One-shot demo seeder. Populates a project with realistic-looking
 * commits, notes, references, a treasury, and a small set of settled
 * payments — enough to make the project page, treasury page, and team
 * heatmap look populated for a video recording.
 *
 * Beyond the calling user (who stays a manager), the seeder also creates
 * four demo teammates with role-appropriate authorship:
 *   - Maya Adeyemi   — dev      → ships code commits
 *   - Olu Bankole    — content  → posts notes
 *   - Sarah Chen     — designer → drops Figma + deck refs
 *   - Yusuf Diallo   — pm       → writes decisions, adds notion docs
 *
 * Activity is back-dated across the last ~60 days so the team page
 * heatmap fills out naturally instead of stacking everything on today.
 *
 * Idempotent on demo users (matched by `*@elf.demo` email) and on the
 * treasury. Re-running appends a fresh batch of activity, useful if you
 * want to fatten the heatmap further.
 */

type SeedInput = {
  workspaceId: string;
  projectId: string;
  /** The signed-in user — typically the workspace manager. They stay
   *  attributed to the deposit + the payment approvals. */
  userId: string;
  /** Pseudo-recipient for "settled" payment toAddress. Defaults to the
   *  burn address so it's obviously not a real recipient. */
  recipientAddress?: `0x${string}`;
};

const FAKE_RECIPIENT: `0x${string}` =
  "0x000000000000000000000000000000000000dEaD";

/* -------------------------------------------------------------------------- */
/*  Demo cast                                                                  */
/* -------------------------------------------------------------------------- */

type DemoUserKey = "maya" | "olu" | "sarah" | "yusuf";

type DemoUserSpec = {
  key: DemoUserKey;
  name: string;
  email: string;
  username: string;
  /** Goes onto users.role_profile so the user's profile chip is on-brand. */
  roleProfile: "dev" | "writer" | "designer" | "product-manager";
  /** Becomes their workspace_members.role. */
  workspaceRole: "manager" | "dev" | "content" | "viewer";
};

const DEMO_USERS: DemoUserSpec[] = [
  {
    key: "maya",
    name: "Maya Adeyemi",
    email: "maya@elf.demo",
    username: "maya",
    roleProfile: "dev",
    workspaceRole: "dev"
  },
  {
    key: "olu",
    name: "Olu Bankole",
    email: "olu@elf.demo",
    username: "olu",
    roleProfile: "writer",
    workspaceRole: "content"
  },
  {
    key: "sarah",
    name: "Sarah Chen",
    email: "sarah@elf.demo",
    username: "sarahc",
    roleProfile: "designer",
    workspaceRole: "content"
  },
  {
    key: "yusuf",
    name: "Yusuf Diallo",
    email: "yusuf@elf.demo",
    username: "yusuf",
    roleProfile: "product-manager",
    workspaceRole: "manager"
  }
];

const DEMO_EMAIL_SUFFIX = "@elf.demo";

/* -------------------------------------------------------------------------- */
/*  Seed content — each row carries the demo author who should "own" it       */
/*  and a `daysAgo` so we can back-date createdAt across the heatmap window.  */
/* -------------------------------------------------------------------------- */

type SeedCommit = {
  type: "feat" | "fix" | "ref" | "perf" | "refactor" | "chore";
  scope: string;
  summary: string;
  body: string;
  author: DemoUserKey;
  daysAgo: number;
};

const COMMITS: SeedCommit[] = [
  {
    type: "feat",
    scope: "auth",
    summary: "GitHub OAuth sign-in lands.",
    body:
      "Devs sign in with their GitHub account; the access token is stored on the Better Auth account row and powers the repo picker.",
    author: "maya",
    daysAgo: 58
  },
  {
    type: "feat",
    scope: "treasury",
    summary: "Project treasuries spin up on Base Sepolia.",
    body:
      "Each project gets a fresh wallet — or, opt in to use your own connected wallet for self-custody.",
    author: "maya",
    daysAgo: 45
  },
  {
    type: "fix",
    scope: "cowork",
    summary: "Cowork now talks to Groq when a key is set.",
    body:
      "Free, fast, OpenAI-compatible streaming with full tool-use loop.",
    author: "maya",
    daysAgo: 33
  },
  {
    type: "ref",
    scope: "providers",
    summary: "Provider interfaces sealed off from route handlers.",
    body:
      "Storage, Execution, Messaging, Payment, Inference — partner SDKs never leak past these.",
    author: "maya",
    daysAgo: 20
  },
  {
    type: "perf",
    scope: "notifications",
    summary: "Notification poller backs off on failure.",
    body:
      "Was hammering /unread-count even when the network was clearly down.",
    author: "maya",
    daysAgo: 11
  },
  {
    type: "refactor",
    scope: "team",
    summary: "Split team page into rows + heatmap component.",
    body: "Server-renders the heatmap; no JS shipped for the grid itself.",
    author: "maya",
    daysAgo: 4
  }
];

type SeedNote = {
  summary: string;
  body: string;
  author: DemoUserKey;
  daysAgo: number;
};

const NOTES: SeedNote[] = [
  {
    summary: "Brief from launch call: positioning is clarity, not features.",
    body:
      "Sarah said it best — \"if a tool needs an explanation, it's not a tool, it's a problem.\" Lean every page on the *one* sentence that matters and let the rest breathe.",
    author: "olu",
    daysAgo: 50
  },
  {
    summary: "Designer feedback: tone the green down a hair on dark mode.",
    body:
      "The forest green is too saturated against the warm white in dark surfaces. Try the deep variant for body text, save forest for headings.",
    author: "sarah",
    daysAgo: 38
  },
  {
    summary: "Decision: skip the marketing site rewrite this sprint.",
    body:
      "We don't have the bandwidth and the current copy converts. Revisit after the launch when we have real testimonials to slot in.",
    author: "yusuf",
    daysAgo: 26
  },
  {
    summary: "Onboarding copy locked: \"Leave it to elf.\"",
    body:
      "Tested three variants in user interviews. \"Leave it to elf\" landed every time — implies handoff without losing agency. Ship it.",
    author: "olu",
    daysAgo: 14
  },
  {
    summary: "Sprint goal: cut time-to-first-commit to under 90 seconds.",
    body:
      "Top funnel drop-off is between sign-up and first commit. Trimming the project-create flow from 4 fields to 2 should move the needle.",
    author: "yusuf",
    daysAgo: 6
  }
];

type SeedRef = {
  type: "figma" | "doc" | "deck" | "notion" | "link" | "pdf";
  title: string;
  url: string;
  author: DemoUserKey;
  daysAgo: number;
};

const REFERENCES: SeedRef[] = [
  {
    type: "figma",
    title: "Onboarding wireframes v2",
    url: "https://www.figma.com/file/example/onboarding-v2",
    author: "sarah",
    daysAgo: 55
  },
  {
    type: "doc",
    title: "Original idea doc — what is Elf?",
    url: "https://docs.google.com/document/d/example",
    author: "yusuf",
    daysAgo: 60
  },
  {
    type: "notion",
    title: "Launch checklist + comms plan",
    url: "https://notion.so/example/launch-checklist",
    author: "yusuf",
    daysAgo: 18
  },
  {
    type: "deck",
    title: "Investor narrative — round 1",
    url: "https://docs.google.com/presentation/d/example",
    author: "sarah",
    daysAgo: 9
  }
];

type SeedPayment = {
  amountUsdc: number;
  note: string;
  recipient: DemoUserKey;
  daysAgo: number;
};

const PAYMENTS: SeedPayment[] = [
  {
    amountUsdc: 250,
    note: "Onboarding flow — design + content",
    recipient: "sarah",
    daysAgo: 42
  },
  {
    amountUsdc: 180,
    note: "Cowork tool integration",
    recipient: "maya",
    daysAgo: 30
  },
  {
    amountUsdc: 420,
    note: "Treasury smart contract review",
    recipient: "maya",
    daysAgo: 17
  },
  {
    amountUsdc: 95,
    note: "Brand wordmark refresh",
    recipient: "sarah",
    daysAgo: 5
  }
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fakeTxHash(seed: string): string {
  // Stable-looking hex string — the `0xdemo` prefix lets the wipe path
  // identify these rows without false positives.
  const base = "0xdemo";
  const filler = Buffer.from(seed)
    .toString("hex")
    .padEnd(60, "0")
    .slice(0, 60);
  return base + filler;
}

function daysAgoToDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  // Spread within the day a bit so consecutive seeds don't all bunch at
  // the same hour — keeps the activity feed from looking stamped.
  d.setHours(9 + (daysAgo % 8), (daysAgo * 7) % 60, 0, 0);
  return d;
}

/**
 * Upsert a demo user by email and ensure they're a workspace member.
 * Returns the user id either way so the caller can attribute rows.
 *
 * Defensive against:
 *   - existing user with the same email (re-uses it)
 *   - existing user (real account) holding the demo username — falls
 *     back to no username so the unique index doesn't blow up
 *   - TOCTOU on the workspace_members upsert (onConflictDoNothing
 *     against the unique-on-(workspace,user) constraint)
 */
async function ensureDemoUser(
  workspaceId: string,
  spec: DemoUserSpec
): Promise<string> {
  // Existing demo user by email?
  const [existingByEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, spec.email))
    .limit(1);

  let userId: string;
  if (existingByEmail) {
    userId = existingByEmail.id;
  } else {
    // Is the username we'd like already claimed by someone else?
    const [usernameClash] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, spec.username))
      .limit(1);

    const inserted = await db
      .insert(users)
      .values({
        name: spec.name,
        email: spec.email,
        emailVerified: true,
        username: usernameClash ? null : spec.username,
        roleProfile: spec.roleProfile
      })
      .onConflictDoNothing({ target: users.email })
      .returning({ id: users.id });

    if (inserted.length > 0) {
      userId = inserted[0].id;
    } else {
      // A concurrent insert won; re-select.
      const [refetch] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, spec.email))
        .limit(1);
      if (!refetch) {
        throw new Error(
          `ensureDemoUser: could not insert or find ${spec.email}`
        );
      }
      userId = refetch.id;
    }
  }

  // Ensure workspace membership; rely on the unique-on-(workspace,user)
  // index instead of select-then-insert so two concurrent seed clicks
  // don't blow up.
  await db
    .insert(workspaceMembers)
    .values({
      workspaceId,
      userId,
      role: spec.workspaceRole,
      joinedAt: daysAgoToDate(75)
    })
    .onConflictDoNothing({
      target: [workspaceMembers.workspaceId, workspaceMembers.userId]
    });

  return userId;
}

/* -------------------------------------------------------------------------- */
/*  Seed                                                                       */
/* -------------------------------------------------------------------------- */

export type SeedResult = {
  commits: number;
  notes: number;
  attachments: number;
  payments: number;
  treasuryCreated: boolean;
  membersAdded: number;
};

export async function seedProjectDemo(input: SeedInput): Promise<SeedResult> {
  const { workspaceId, projectId, userId } = input;
  const recipient = input.recipientAddress ?? FAKE_RECIPIENT;

  // 1. Ensure the four demo teammates exist + are workspace members.
  const userIdByKey = new Map<DemoUserKey, string>();
  for (const spec of DEMO_USERS) {
    const id = await ensureDemoUser(workspaceId, spec);
    userIdByKey.set(spec.key, id);
  }

  function authorIdFor(key: DemoUserKey): string {
    return userIdByKey.get(key) ?? userId;
  }

  // 2. Commits — back-dated, attributed to demo authors. Using direct
  //    db.insert so we can set createdAt; the repository's createCommit
  //    forces defaultNow().
  let commitsCount = 0;
  for (const c of COMMITS) {
    await db.insert(commits).values({
      workspaceId,
      projectId,
      authorId: authorIdFor(c.author),
      type: c.type,
      summary: c.summary,
      scope: c.scope,
      body: c.body,
      createdAt: daysAgoToDate(c.daysAgo)
    });
    commitsCount++;
  }

  // 3. Notes — content commits, distributed across writers + PM.
  let notesCount = 0;
  for (const n of NOTES) {
    await db.insert(commits).values({
      workspaceId,
      projectId,
      authorId: authorIdFor(n.author),
      type: "content",
      summary: n.summary,
      body: n.body,
      createdAt: daysAgoToDate(n.daysAgo)
    });
    notesCount++;
  }

  // 4. References — designer/PM contributions.
  let attachmentsCount = 0;
  for (const a of REFERENCES) {
    await db.insert(attachments).values({
      projectId,
      addedBy: authorIdFor(a.author),
      type: a.type,
      title: a.title,
      url: a.url,
      createdAt: daysAgoToDate(a.daysAgo)
    });
    attachmentsCount++;
  }

  // 5. Treasury — keep server-managed default; create only on first run.
  let treasuryCreated = false;
  let treasury = await findTreasuryByProject(projectId);
  if (!treasury) {
    treasury = await createTreasury({ workspaceId, projectId });
    treasuryCreated = true;
  }

  // 6. Settled payments — paid out to demo teammates, approved by the
  //    seeding manager. Direct insert lets us back-date both the row and
  //    the matching treasury_transactions entry.
  let paymentsCount = 0;
  for (const p of PAYMENTS) {
    const txHash = fakeTxHash(`${treasury.id}-${p.amountUsdc}-${p.daysAgo}`);
    const settledAt = daysAgoToDate(p.daysAgo);
    const approvedAt = daysAgoToDate(p.daysAgo + 1);

    const [payment] = await db
      .insert(contributorPayments)
      .values({
        workspaceId,
        projectId,
        treasuryId: treasury.id,
        recipientId: authorIdFor(p.recipient),
        amountUsdc: String(p.amountUsdc),
        tokenOut: "USDC",
        swapRequired: false,
        approvedBy: userId,
        approvedAt,
        status: "settled",
        uniswapTxHash: txHash,
        settledAt,
        createdAt: approvedAt
      })
      .returning({ id: contributorPayments.id });

    await db.insert(treasuryTransactions).values({
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
      notes: p.note,
      createdAt: settledAt
    });
    void payment;
    paymentsCount++;
  }

  // 7. One deposit so the on-chain history isn't all outbound.
  await db.insert(treasuryTransactions).values({
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
    notes: "Initial demo deposit",
    createdAt: daysAgoToDate(62)
  });

  return {
    commits: commitsCount,
    notes: notesCount,
    attachments: attachmentsCount,
    payments: paymentsCount,
    treasuryCreated,
    membersAdded: userIdByKey.size
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
  membersRemoved: number;
};

/**
 * Best-effort cleanup of seeded content. Targets:
 *   - commits/notes whose summary matches one of the canned seed strings
 *   - attachments whose title matches one of the canned seed titles
 *   - contributor_payments + treasury_transactions whose tx_hash starts
 *     with the `0xdemo` sentinel
 *   - workspace_members rows for the demo cast (matched by `@elf.demo`
 *     email) — the user rows themselves are left so a re-seed reuses
 *     the same authorship
 *
 * Only acts on rows scoped to the given (workspaceId, projectId), so a
 * stray real commit with the same summary in a different project is
 * untouched. The treasury itself is preserved.
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

  // Remove demo users from the workspace_members table only — keep the
  // user rows so a re-seed reuses the same identities (and the wipe stays
  // safe even if the manager invited the demo email by hand somewhere).
  const demoUserIds = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `%${DEMO_EMAIL_SUFFIX}`));

  let membersRemoved = 0;
  if (demoUserIds.length > 0) {
    const removed = await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          inArray(
            workspaceMembers.userId,
            demoUserIds.map((u) => u.id)
          )
        )
      )
      .returning({ id: workspaceMembers.id });
    membersRemoved = removed.length;
  }

  return {
    commits: commitsDeleted,
    notes: notesDeleted,
    attachments: deletedAttachmentRows.length,
    payments: paymentsDeleted,
    transactions: txsDeleted,
    membersRemoved
  };
}
