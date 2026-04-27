import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { listForkRequests } from "@/db/repositories/forks";
import { findUsersById } from "@/db/repositories/users";
import { listProjects } from "@/db/repositories/projects";
import { ReviewForkButtons } from "./ReviewForkButtons";
import { cn } from "@/lib/cn";

type Props = {
  params: { codename: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `Fork requests — ${params.codename}` };
}

const statusTone: Record<string, string> = {
  pending: "bg-elf-deep/15 text-elf-deep",
  approved: "bg-elf-mint text-elf-forest",
  rejected: "bg-elf-border/40 text-elf-muted"
};

export default async function ForksPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();
  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const forks = await listForkRequests({ workspaceId: workspace.id, limit: 100 });
  const requesterIds = forks.map((f) => f.requesterId);
  const reviewerIds = forks.map((f) => f.reviewerId).filter((x): x is string => !!x);
  const userMap = await findUsersById([...requesterIds, ...reviewerIds]);

  const projectsList = await listProjects(workspace.id);
  const projectById = Object.fromEntries(
    projectsList.map((p) => [p.id, p])
  );

  const isManager = role === "manager";
  const pending = forks.filter((f) => f.status === "pending");
  const reviewed = forks.filter((f) => f.status !== "pending");

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href={`/workspaces/${workspace.codename}`} className="flex items-center gap-3">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">forks</span>
          </Link>
          <HeaderActions user={session.user} />
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-shell">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
            access requests
          </p>
          <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
            Fork requests
          </h1>
          <p className="text-base text-elf-muted max-w-prose mb-12">
            Contributors ask for their own copy of a project&apos;s linked
            repo. Approval is a deliberate two-step{" "}
            {isManager ? "(you'll see the confirm panel after the first click)" : "for the workspace manager"}.
            Every decision is recorded in the audit log forever.
          </p>

          {pending.length > 0 && (
            <Section
              title="Pending"
              count={pending.length}
              forks={pending}
              userMap={userMap}
              projectById={projectById}
              codename={workspace.codename}
              isManager={isManager}
            />
          )}

          {pending.length === 0 && (
            <div className="border-hair rounded-card p-10 max-w-prose mb-12">
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
                nothing pending
              </p>
              <h2 className="text-xl text-elf-forest mb-2">All caught up.</h2>
              <p className="text-sm text-elf-muted leading-relaxed">
                When a contributor opens a fork request, it lands here for
                review.
              </p>
            </div>
          )}

          {reviewed.length > 0 && (
            <Section
              title="History"
              count={reviewed.length}
              forks={reviewed}
              userMap={userMap}
              projectById={projectById}
              codename={workspace.codename}
              isManager={false}
              compact
            />
          )}
        </div>
      </section>
    </main>
  );
}

type ForkRow = Awaited<ReturnType<typeof listForkRequests>>[number];

function Section({
  title,
  count,
  forks,
  userMap,
  projectById,
  codename,
  isManager,
  compact
}: {
  title: string;
  count: number;
  forks: ForkRow[];
  userMap: Record<string, { name: string }>;
  projectById: Record<string, { name: string; slug: string }>;
  codename: string;
  isManager: boolean;
  compact?: boolean;
}) {
  return (
    <div className="mb-12">
      <h2 className="text-lg text-elf-forest mb-4">
        {title} <span className="text-elf-muted">({count})</span>
      </h2>
      <ol className="space-y-3">
        {forks.map((fork) => {
          const project = projectById[fork.projectId];
          const requester = userMap[fork.requesterId]?.name ?? "—";
          const reviewer = fork.reviewerId
            ? userMap[fork.reviewerId]?.name ?? "—"
            : null;
          return (
            <li
              key={fork.id}
              className="border-hair rounded-card p-5 bg-elf-warm-white"
            >
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={cn(
                        "mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-badge",
                        statusTone[fork.status]
                      )}
                    >
                      {fork.status}
                    </span>
                    {project && (
                      <Link
                        href={`/workspaces/${codename}/projects/${project.slug}`}
                        className="text-sm text-elf-forest underline underline-offset-2 truncate"
                      >
                        {project.name}
                      </Link>
                    )}
                    <span className="text-elf-border">·</span>
                    <span className="text-sm text-elf-ink">{requester}</span>
                    <span className="text-elf-border">·</span>
                    <span className="text-xs text-elf-muted">
                      {new Date(fork.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                  {fork.requesterNote && (
                    <p className="text-sm text-elf-muted leading-relaxed">
                      {fork.requesterNote}
                    </p>
                  )}
                  {reviewer && fork.reviewerNote && (
                    <p className="text-xs text-elf-muted leading-relaxed mt-1.5">
                      <span className="mono uppercase tracking-widest text-elf-mid">
                        {reviewer} wrote:
                      </span>{" "}
                      {fork.reviewerNote}
                    </p>
                  )}
                  {fork.githubForkUrl && (
                    <a
                      href={fork.githubForkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mono text-xs text-elf-deep underline underline-offset-2 break-all mt-2 inline-block"
                    >
                      {fork.githubForkUrl}
                    </a>
                  )}
                </div>
              </div>

              {!compact && fork.status === "pending" && isManager && (
                <ReviewForkButtons codename={codename} forkId={fork.id} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
