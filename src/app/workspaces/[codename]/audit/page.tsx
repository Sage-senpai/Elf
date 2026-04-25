import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "@/components/auth/UserMenu";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { listAuditEntries } from "@/lib/audit";
import { cn } from "@/lib/cn";

type Props = {
  params: { codename: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `Audit log — ${params.codename}` };
}

const typeLabel: Record<string, string> = {
  workspace_created: "Workspace created",
  project_created: "Project created",
  commit_created: "Commit",
  fork_requested: "Fork requested",
  fork_approved: "Fork approved",
  fork_rejected: "Fork rejected",
  attachment_added: "Attachment added",
  payment_created: "Payment created",
  payment_settled: "Payment settled",
  agent_action: "Agent action"
};

export default async function AuditPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const entries = await listAuditEntries({ workspaceId: workspace.id, limit: 100 });

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href={`/workspaces/${workspace.codename}`} className="flex items-center gap-3">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">audit</span>
          </Link>
          <UserMenu
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image
            }}
          />
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-shell">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            permanent record
          </p>
          <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
            Audit log
          </h1>
          <p className="text-base text-elf-muted max-w-prose mb-12">
            Every workspace event is content-addressed and append-only.
            Nothing here can be edited or deleted — not by you, not by us.
            Click any entry&apos;s hash to verify it independently on-chain.
          </p>

          {entries.length === 0 ? (
            <EmptyAudit />
          ) : (
            <ol className="space-y-2">
              {entries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyAudit() {
  return (
    <div className="border-hair rounded-card p-10 max-w-prose">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        nothing yet
      </p>
      <h2 className="text-xl text-elf-forest mb-2">
        Your audit log starts when you do.
      </h2>
      <p className="text-sm text-elf-muted leading-relaxed">
        Every workspace and project creation, commit, fork approval, and
        contributor payment writes a tamper-proof entry here. Take an action
        in the workspace and refresh — entries land within a few seconds.
      </p>
    </div>
  );
}

function AuditRow({
  entry
}: {
  entry: Awaited<ReturnType<typeof listAuditEntries>>[number];
}) {
  const isMock = entry.zgRootHash.startsWith("mock_");
  const payload = entry.payload as { payload?: Record<string, unknown> } | null;
  const inner = (payload?.payload ?? {}) as Record<string, unknown>;
  const summary = describe(entry.entryType, inner);

  return (
    <li className="border-hair rounded-card p-5 bg-elf-warm-white">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <span className="mono text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-badge bg-elf-mint text-elf-forest">
          {typeLabel[entry.entryType] ?? entry.entryType}
        </span>
        <span className="text-xs text-elf-muted">
          {new Date(entry.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })}
        </span>
        {isMock && (
          <span
            title="ZG_PRIVATE_KEY isn't set, so this entry hasn't been anchored on-chain yet. Set the key and new entries will be real."
            className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge bg-elf-border/60 text-elf-muted cursor-help"
          >
            not yet anchored
          </span>
        )}
      </div>
      <p className="text-sm text-elf-ink mb-3">{summary}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <HashChip
          label="root"
          value={entry.zgRootHash}
          mock={isMock}
        />
        {entry.zgTxHash && <HashChip label="tx" value={entry.zgTxHash} />}
        {entry.previousHash && (
          <HashChip
            label="prev"
            value={entry.previousHash}
            mock={entry.previousHash.startsWith("mock_")}
          />
        )}
      </div>
    </li>
  );
}

function HashChip({
  label,
  value,
  mock
}: {
  label: string;
  value: string;
  mock?: boolean;
}) {
  return (
    <span
      className={cn(
        "mono text-[11px] inline-flex items-center gap-2 px-2 py-1 rounded-badge border-hair",
        mock ? "text-elf-muted" : "text-elf-ink"
      )}
    >
      <span className="uppercase tracking-widest text-elf-muted">{label}</span>
      <span className="truncate max-w-[180px]">{value}</span>
    </span>
  );
}

function describe(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "workspace_created":
      return `Workspace ${quote(payload.codename)} (${quote(payload.display_name)}) created.`;
    case "project_created":
      return `Project ${quote(payload.name)} added (slug: ${quote(payload.slug)}).`;
    case "commit_created":
      return `Commit ${quote(payload.summary)} on ${quote(payload.scope ?? payload.project_slug)}.`;
    case "fork_approved":
      return `Fork request approved.`;
    case "fork_rejected":
      return `Fork request rejected.`;
    case "fork_requested":
      return `Fork requested.`;
    case "attachment_added":
      return `Attachment ${quote(payload.title ?? payload.url)} added.`;
    case "payment_created":
      return `Payment created.`;
    case "payment_settled":
      return `Payment settled.`;
    case "agent_action":
      return `Shelf Agent ran an action.`;
    default:
      return type;
  }
}

function quote(value: unknown): string {
  if (value == null) return "—";
  return `“${String(value)}”`;
}
