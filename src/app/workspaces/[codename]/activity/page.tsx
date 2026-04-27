import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { listWorkspaceActivity } from "@/db/repositories/activity";
import { findUsersById } from "@/db/repositories/users";

type Props = {
  params: { codename: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `Activity — ${params.codename}` };
}

export default async function ActivityPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const events = await listWorkspaceActivity(workspace.id, 100);
  const authors = await findUsersById(
    events.map((e) => e.actorId).filter((x): x is string => !!x)
  );

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href={`/workspaces/${workspace.codename}`} className="flex items-center gap-3">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">activity</span>
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
        <div className="mx-auto max-w-shell">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            workspace heartbeat
          </p>
          <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
            Activity
          </h1>
          <p className="text-base text-elf-muted max-w-prose mb-12">
            Everything happening in this workspace, in plain English. Read it
            once and you&apos;re caught up — every commit, every fork
            request, every payment, every contributor join.
          </p>

          {events.length === 0 ? (
            <EmptyActivity />
          ) : (
            <ActivityFeed
              workspaceCodename={workspace.codename}
              activity={events}
              authorById={authors}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyActivity() {
  return (
    <div className="border-hair rounded-card p-10 max-w-prose">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        nothing yet
      </p>
      <h2 className="text-xl text-elf-forest mb-2">
        The feed wakes up when you do.
      </h2>
      <p className="text-sm text-elf-muted leading-relaxed">
        Add a project, push a commit, or invite a contributor — every action
        appears here in real time so the rest of the team is always caught up.
      </p>
    </div>
  );
}
