import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { Button } from "@/components/ui/Button";
import { ProjectGrid } from "@/components/projects/ProjectGrid";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { listProjects } from "@/db/repositories/projects";
import { listWorkspaceActivity } from "@/db/repositories/activity";
import { findUsersById } from "@/db/repositories/users";

type Props = {
  params: { codename: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `${params.codename} — elf` };
}

export default async function WorkspacePage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const projects = await listProjects(workspace.id);
  const recentActivity = await listWorkspaceActivity(workspace.id, 6);
  const activityAuthors = await findUsersById(
    recentActivity.map((a) => a.actorId).filter((x): x is string => !!x)
  );
  const canCreate = role !== "viewer";

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" aria-label="elf">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
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
          <div className="flex items-end justify-between gap-6 flex-wrap mb-12">
            <div>
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
                {role}
              </p>
              <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-2">
                {workspace.displayName}
              </h1>
              <p className="text-sm text-elf-muted">
                <span className="mono text-elf-ink">{workspace.codename}</span>
                {workspace.githubOrg && (
                  <>
                    {" · GitHub: "}
                    <span className="mono text-elf-ink">{workspace.githubOrg}</span>
                  </>
                )}
                {" · "}
                {projects.length === 1
                  ? "1 project"
                  : `${projects.length} projects`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                href={`/workspaces/${workspace.codename}/activity`}
                variant="secondary"
                size="md"
              >
                Activity
              </Button>
              <Button
                href={`/workspaces/${workspace.codename}/audit`}
                variant="secondary"
                size="md"
              >
                Audit log
              </Button>
              <Button
                href={`/workspaces/${workspace.codename}/agent`}
                variant="secondary"
                size="md"
              >
                Agent
              </Button>
              <Button
                href={`/workspaces/${workspace.codename}/forks`}
                variant="secondary"
                size="md"
              >
                Forks
              </Button>
              <Button
                href={`/workspaces/${workspace.codename}/team`}
                variant="secondary"
                size="md"
              >
                Team
              </Button>
              <Button
                href={`/workspaces/${workspace.codename}/mcp`}
                variant="secondary"
                size="md"
              >
                MCP
              </Button>
              {projects.length > 0 && canCreate && (
                <Button
                  href={`/workspaces/${workspace.codename}/projects/new`}
                  size="md"
                >
                  New project
                </Button>
              )}
            </div>
          </div>

          {projects.length === 0 ? (
            <EmptyShelf workspaceCodename={workspace.codename} canCreate={canCreate} />
          ) : (
            <ProjectGrid workspaceCodename={workspace.codename} projects={projects} />
          )}

          {recentActivity.length > 0 && (
            <div className="mt-16 pt-12 border-t border-hair">
              <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div>
                  <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-2">
                    workspace heartbeat
                  </p>
                  <h2 className="display text-2xl text-elf-forest leading-tight">
                    Latest activity
                  </h2>
                </div>
                <Link
                  href={`/workspaces/${workspace.codename}/activity`}
                  className="text-sm text-elf-deep hover:text-elf-forest underline underline-offset-2"
                >
                  See all activity →
                </Link>
              </div>
              <ActivityFeed
                workspaceCodename={workspace.codename}
                activity={recentActivity}
                authorById={activityAuthors}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyShelf({
  workspaceCodename,
  canCreate
}: {
  workspaceCodename: string;
  canCreate: boolean;
}) {
  return (
    <div className="border-hair rounded-card p-10 max-w-prose">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        your shelf is empty
      </p>
      <h2 className="text-xl text-elf-forest mb-2">Add your first project.</h2>
      <p className="text-sm text-elf-muted leading-relaxed mb-6">
        A project is anything you&apos;re building — an app, a doc set, a
        campaign. You can link a GitHub repo or start without one and link
        later.
      </p>
      {canCreate ? (
        <Button href={`/workspaces/${workspaceCodename}/projects/new`} size="md">
          Add a project
        </Button>
      ) : (
        <p className="text-xs text-elf-muted">
          Viewers can&apos;t create projects. Ask a workspace manager to add one.
        </p>
      )}
    </div>
  );
}
