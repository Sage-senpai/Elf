import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { findProjectBySlug } from "@/db/repositories/projects";
import {
  ensureTreasury,
  getUsdcBalance,
  getTreasuryForProject
} from "@/lib/treasury/service";
import {
  listPayments,
  listTreasuryTransactions
} from "@/db/repositories/treasuries";
import { findUsersById } from "@/db/repositories/users";
import { PayContributorForm } from "./PayContributorForm";
import { DepositCard } from "./DepositCard";
import { cn } from "@/lib/cn";

type Props = {
  params: { codename: string; slug: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `Treasury — ${params.slug}` };
}

const statusTone: Record<string, string> = {
  pending: "bg-elf-border/40 text-elf-muted",
  approved: "bg-elf-deep/15 text-elf-deep",
  swapping: "bg-elf-deep/15 text-elf-deep",
  settled: "bg-elf-mint text-elf-forest",
  failed: "bg-red-100 text-red-700"
};

export default async function TreasuryPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();
  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();
  const project = await findProjectBySlug(workspace.id, params.slug);
  if (!project) notFound();

  const isManager = role === "manager";

  // Treasury exists yet?
  const existing = await getTreasuryForProject(project.id);

  if (!existing) {
    return (
      <Shell workspace={workspace} project={project} session={session}>
        <SetupTreasury
          codename={workspace.codename}
          slug={project.slug}
          isManager={isManager}
        />
      </Shell>
    );
  }

  const balance = await getUsdcBalance(existing);
  const payments = await listPayments(existing.id, 50);
  const transactions = await listTreasuryTransactions(existing.id, 30);
  const recipientNames = await findUsersById(payments.map((p) => p.recipientId));

  const settledPayments = payments.filter((p) => p.status === "settled");
  const totalVolume = settledPayments.reduce(
    (sum, p) => sum + Number(p.amountUsdc || 0),
    0
  );
  const txCount = transactions.length;
  const contributorsPaid = new Set(settledPayments.map((p) => p.recipientId)).size;

  return (
    <Shell workspace={workspace} project={project} session={session}>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <BalanceCard
            balance={balance.display}
            symbol={balance.symbol}
            source={balance.source}
            walletAddress={existing.walletAddress}
            chainId={existing.chainId}
          />

          <VolumeStrip
            totalVolume={totalVolume}
            paymentsCount={settledPayments.length}
            txCount={txCount}
            contributorsPaid={contributorsPaid}
          />

          {isManager && (
            <PayContributorForm
              codename={workspace.codename}
              slug={project.slug}
              treasuryAddress={existing.walletAddress}
            />
          )}

          <PaymentsList payments={payments} recipientNames={recipientNames} />
        </div>

        <aside className="space-y-8">
          <DepositCard
            walletAddress={existing.walletAddress}
            chainId={existing.chainId}
          />
          <TransactionsList transactions={transactions} />
        </aside>
      </div>
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */
/*  Layout shell                                                              */
/* -------------------------------------------------------------------------- */

function Shell({
  workspace,
  project,
  session,
  children
}: {
  workspace: { codename: string; displayName: string };
  project: { slug: string; name: string };
  session: { user: { name: string; email: string; image?: string | null } };
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link
            href={`/workspaces/${workspace.codename}/projects/${project.slug}`}
            className="flex items-center gap-3"
          >
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{project.slug}</span>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">treasury</span>
          </Link>
          <HeaderActions user={session.user} />
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-shell">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
            project treasury
          </p>
          <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
            {project.name}
          </h1>
          <p className="text-base text-elf-muted max-w-prose mb-12">
            Hold USDC, accept deposits, and pay contributors on-chain. Every
            transaction lands in the project&apos;s permanent audit log.
          </p>
          {children}
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Setup state                                                               */
/* -------------------------------------------------------------------------- */

function SetupTreasury({
  codename,
  slug,
  isManager
}: {
  codename: string;
  slug: string;
  isManager: boolean;
}) {
  return (
    <div className="border-hair rounded-card p-10 max-w-prose">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        no treasury yet
      </p>
      <h2 className="text-xl text-elf-forest mb-2">
        Spin up a treasury for this project.
      </h2>
      <p className="text-sm text-elf-muted leading-relaxed mb-6">
        Creating a treasury generates a fresh wallet on Base{" "}
        <span className="mono">testnet</span> for this project. You can deposit
        USDC into it and pay contributors directly from the wallet — no
        intermediaries, no Stripe round-trip, no invoicing.
      </p>
      {isManager ? (
        <SetupForm codename={codename} slug={slug} />
      ) : (
        <p className="text-xs text-elf-muted">
          Only the workspace manager can set up a treasury. Ask them to enable
          it for this project.
        </p>
      )}
    </div>
  );
}

function SetupForm({ codename, slug }: { codename: string; slug: string }) {
  return (
    <form
      method="post"
      action={`/api/workspaces/${codename}/projects/${slug}/treasury`}
    >
      <Button type="submit" size="md">
        Set up treasury
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Balance card                                                              */
/* -------------------------------------------------------------------------- */

function BalanceCard({
  balance,
  symbol,
  source,
  walletAddress,
  chainId
}: {
  balance: string;
  symbol: string;
  source: "chain" | "cache";
  walletAddress: string;
  chainId: number;
}) {
  const network = chainId === 8453 ? "Base" : "Base Sepolia";
  return (
    <div className="border-hair rounded-card p-7 md:p-8 bg-elf-warm-white">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <p className="mono text-xs uppercase tracking-widest text-elf-mid">
          balance
        </p>
        <span
          className={cn(
            "mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge",
            source === "chain"
              ? "bg-elf-mint text-elf-forest"
              : "bg-elf-border/40 text-elf-muted"
          )}
        >
          {source === "chain" ? "live" : "cached"}
        </span>
      </div>
      <p className="display text-5xl md:text-6xl text-elf-forest leading-none mb-2">
        {balance}
      </p>
      <p className="mono text-sm text-elf-muted">
        {symbol} · {network}
      </p>
      <p className="mono text-xs text-elf-muted mt-4 break-all">
        {walletAddress}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Volume strip                                                              */
/* -------------------------------------------------------------------------- */

function VolumeStrip({
  totalVolume,
  paymentsCount,
  txCount,
  contributorsPaid
}: {
  totalVolume: number;
  paymentsCount: number;
  txCount: number;
  contributorsPaid: number;
}) {
  const formatted = totalVolume.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
      <Stat label="Lifetime volume" value={`$${formatted}`} accent />
      <Stat label="Payments settled" value={String(paymentsCount)} />
      <Stat label="On-chain txs" value={String(txCount)} />
      <Stat label="Contributors paid" value={String(contributorsPaid)} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-hair rounded-card p-3 sm:p-4 min-w-0",
        accent && "bg-elf-mint/15"
      )}
    >
      <p className="mono text-[10px] uppercase tracking-widest text-elf-mid mb-2 truncate">
        {label}
      </p>
      <p
        className={cn(
          "display leading-none",
          accent ? "text-2xl text-elf-forest" : "text-xl text-elf-ink"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Payments + transactions                                                   */
/* -------------------------------------------------------------------------- */

function PaymentsList({
  payments,
  recipientNames
}: {
  payments: Awaited<ReturnType<typeof listPayments>>;
  recipientNames: Record<string, { name: string }>;
}) {
  return (
    <div>
      <h2 className="text-lg text-elf-forest mb-4">
        {payments.length === 0
          ? "No payments yet"
          : payments.length === 1
            ? "1 payment"
            : `${payments.length} payments`}
      </h2>
      {payments.length === 0 ? (
        <div className="border-hair rounded-card p-6">
          <p className="text-sm text-elf-muted leading-relaxed">
            Approve a contributor&apos;s commit and pay them with the form
            above. Settled payments appear here with on-chain transaction
            hashes.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="border-hair rounded-card p-4 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span
                    className={cn(
                      "mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-badge",
                      statusTone[p.status] ?? statusTone.pending
                    )}
                  >
                    {p.status}
                  </span>
                  <span className="text-sm text-elf-ink">
                    {recipientNames[p.recipientId]?.name ?? "—"}
                  </span>
                  <span className="text-elf-border">·</span>
                  <span className="mono text-xs text-elf-muted">
                    {Number(p.amountUsdc).toLocaleString()} {p.tokenOut}
                  </span>
                </div>
                {p.uniswapTxHash && (
                  <p className="mono text-[11px] text-elf-muted truncate">
                    tx: {p.uniswapTxHash}
                  </p>
                )}
              </div>
              <span className="mono text-xs text-elf-muted">
                {new Date(p.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric"
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TransactionsList({
  transactions
}: {
  transactions: Awaited<ReturnType<typeof listTreasuryTransactions>>;
}) {
  return (
    <div className="border-hair rounded-card p-5">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        on-chain history
      </p>
      {transactions.length === 0 ? (
        <p className="text-sm text-elf-muted">
          On-chain transactions appear here as soon as they confirm.
        </p>
      ) : (
        <ol className="space-y-3">
          {transactions.map((t) => (
            <li key={t.id} className="text-xs">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="mono uppercase tracking-widest text-elf-mid">
                  {t.type}
                </span>
                {t.amountUsdc && (
                  <span className="text-elf-ink">
                    {Number(t.amountUsdc).toLocaleString()} {t.tokenOut ?? "USDC"}
                  </span>
                )}
              </div>
              {t.txHash && (
                <p className="mono text-[11px] text-elf-muted truncate">
                  {t.txHash}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
