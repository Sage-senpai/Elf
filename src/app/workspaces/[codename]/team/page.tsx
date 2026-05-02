import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { InviteForm } from "@/components/team/InviteForm";
import { PendingInvites } from "@/components/team/PendingInvites";
import { ContributionHeatmap } from "@/components/team/ContributionHeatmap";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import {
  listMemberContributions,
  listPendingInvites,
  listWorkspaceMembers
} from "@/db/repositories/invites";

type Props = { params: { codename: string } };

export async function generateMetadata({ params }: Props) {
  return { title: `team — ${params.codename} — elf` };
}

export default async function TeamPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const [members, pending, contributions] = await Promise.all([
    listWorkspaceMembers(workspace.id),
    role === "manager" ? listPendingInvites(workspace.id) : Promise.resolve([]),
    listMemberContributions(workspace.id)
  ]);

  const totalContributions = Array.from(contributions.values()).reduce(
    (sum, r) => sum + r.total,
    0
  );

  // Best-effort origin for the invite-link copy button. Falls back to
  // request origin in dev / preview deploys.
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = host ? `${proto}://${host}` : "";

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" aria-label="elf">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <Link
              href={`/workspaces/${workspace.codename}`}
              className="mono text-sm text-elf-ink hover:text-elf-deep"
            >
              {workspace.codename}
            </Link>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-mid">team</span>
          </Link>
          <HeaderActions
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image
            }}
          />
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-shell space-y-12">
          <div>
            <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
              {role}
            </p>
            <h1 className="display text-3xl md:text-4xl text-elf-forest leading-tight mb-2">
              Team
            </h1>
            <p className="text-sm text-elf-muted">
              {members.length === 1 ? "1 member" : `${members.length} members`}
              {role === "manager" && pending.length > 0
                ? ` · ${pending.length} pending invite${pending.length === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>

          {role === "manager" ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <InviteForm workspaceCodename={workspace.codename} />
              <div className="space-y-3">
                <p className="mono text-xs uppercase tracking-widest text-elf-mid">
                  pending invites
                </p>
                <PendingInvites
                  workspaceCodename={workspace.codename}
                  pending={pending}
                  origin={origin}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-elf-muted border-hair rounded-card p-5">
              Only workspace managers can invite new members. Talk to a manager
              if you&apos;d like to add someone to{" "}
              <span className="mono">{workspace.codename}</span>.
            </p>
          )}

          <div>
            <div className="flex items-end justify-between gap-4 flex-wrap mb-3">
              <p className="mono text-xs uppercase tracking-widest text-elf-mid">
                members &amp; contributions
              </p>
              <p className="mono text-[11px] uppercase tracking-widest text-elf-muted">
                {totalContributions} total · last 12 weeks
              </p>
            </div>
            <ul className="divide-y divide-hair border-hair rounded-card">
              {members.map((m) => {
                const stats = contributions.get(m.userId);
                return (
                  <li
                    key={m.id}
                    className="px-4 py-4 flex items-start gap-4 flex-wrap"
                  >
                    {m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image}
                        alt=""
                        className="w-10 h-10 rounded-full border-hair shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-elf-mint/40 flex items-center justify-center text-[12px] mono text-elf-forest shrink-0">
                        {m.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm text-elf-ink truncate">
                          {m.name}
                          {m.username ? (
                            <span className="text-elf-muted mono text-xs ml-1.5">
                              @{m.username}
                            </span>
                          ) : null}
                        </p>
                        <span className="mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-badge bg-elf-border/40 text-elf-muted">
                          {m.role}
                        </span>
                      </div>
                      <p className="text-xs text-elf-muted truncate mb-2">
                        {m.email}
                      </p>
                      <p className="mono text-[10px] uppercase tracking-widest text-elf-muted">
                        <span className="text-elf-ink">
                          {stats?.total ?? 0}
                        </span>{" "}
                        contribution{(stats?.total ?? 0) === 1 ? "" : "s"}
                        {" · "}
                        {stats?.codeCommits ?? 0} commits
                        {" · "}
                        {stats?.notes ?? 0} notes
                        {" · "}
                        {stats?.attachments ?? 0} refs
                      </p>
                    </div>
                    <ContributionHeatmap
                      dailyCounts={stats?.dailyCounts ?? {}}
                      className="shrink-0"
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
