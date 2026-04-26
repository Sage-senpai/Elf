import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "@/components/auth/UserMenu";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { getAgentStatus } from "@/lib/agent/shelf-agent";
import { findUsersById } from "@/db/repositories/users";
import { listProjects } from "@/db/repositories/projects";
import { RunAgentButton } from "./RunAgentButton";

type Props = {
  params: { codename: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `Agent — ${params.codename}` };
}

export default async function AgentPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();
  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const status = await getAgentStatus(workspace.id);
  const allProjects = await listProjects(workspace.id);
  const staleIds = new Set(status?.staleProjects ?? []);
  const staleProjects = allProjects.filter((p) => staleIds.has(p.id));

  const isManager = role === "manager";
  const onChainEnabled =
    !!process.env.SHELF_AGENT_CONTRACT_ADDRESS &&
    !!process.env.AGENT_WALLET_PRIVATE_KEY;

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href={`/workspaces/${workspace.codename}`} className="flex items-center gap-3">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">agent</span>
          </Link>
          <UserMenu user={session.user} />
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-shell">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
            shelf agent
          </p>
          <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
            Autonomous workspace monitor
          </h1>
          <p className="text-base text-elf-muted max-w-prose mb-12">
            Runs on a schedule, scans every project, and pings the owner
            when something&apos;s gone quiet for too long. Each run is
            written to the immutable audit log and anchored on-chain via
            the ShelfAgentStateManager contract.
          </p>

          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-6">
              <StatusCard status={status} onChainEnabled={onChainEnabled} />
              {staleProjects.length > 0 && (
                <StaleList
                  workspaceCodename={workspace.codename}
                  projects={staleProjects.map((p) => ({
                    name: p.name,
                    slug: p.slug,
                    ownerName: ""
                  }))}
                />
              )}
            </div>

            {isManager ? (
              <RunAgentButton codename={workspace.codename} />
            ) : (
              <div className="border-hair rounded-card p-7 md:p-8 bg-elf-warm-white">
                <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-2">
                  manager only
                </p>
                <p className="text-sm text-elf-muted leading-relaxed">
                  Only workspace managers can manually trigger the agent or
                  change its threshold. The agent still runs automatically on
                  schedule for everyone.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({
  status,
  onChainEnabled
}: {
  status: { lastRunAt: Date | null; lastAction: string | null; staleProjects: string[] | null } | null;
  onChainEnabled: boolean;
}) {
  return (
    <div className="border-hair rounded-card p-7 md:p-8">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        status
      </p>
      {status?.lastRunAt ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-elf-muted mb-0.5">last run</p>
            <p className="text-elf-ink">
              {new Date(status.lastRunAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-elf-muted mb-0.5">last action</p>
            <p className="mono text-xs text-elf-ink break-all">
              {status.lastAction ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-elf-muted mb-0.5">currently flagged</p>
            <p className="text-elf-ink">
              {(status.staleProjects?.length ?? 0)} project
              {(status.staleProjects?.length ?? 0) === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-elf-muted">
          The agent hasn&apos;t run yet for this workspace. Trigger a manual
          scan to start.
        </p>
      )}

      <div className="mt-5 pt-5 border-t border-hair">
        <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-2">
          on-chain anchor
        </p>
        {onChainEnabled ? (
          <p className="text-sm text-elf-deep">
            Enabled. Each run writes to ShelfAgentStateManager on 0G Chain.
          </p>
        ) : (
          <p className="text-sm text-elf-muted leading-relaxed">
            Currently disabled. Deploy{" "}
            <span className="mono">contracts/src/ShelfAgentStateManager.sol</span>{" "}
            and set <span className="mono">SHELF_AGENT_CONTRACT_ADDRESS</span> +{" "}
            <span className="mono">AGENT_WALLET_PRIVATE_KEY</span> to anchor
            every run.
          </p>
        )}
      </div>
    </div>
  );
}

function StaleList({
  workspaceCodename,
  projects
}: {
  workspaceCodename: string;
  projects: Array<{ name: string; slug: string; ownerName: string }>;
}) {
  return (
    <div className="border-hair rounded-card p-6">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        flagged stale
      </p>
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.slug} className="text-sm">
            <Link
              href={`/workspaces/${workspaceCodename}/projects/${p.slug}`}
              className="text-elf-deep hover:text-elf-forest underline underline-offset-2"
            >
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
