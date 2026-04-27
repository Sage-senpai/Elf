import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth/session";
import { listWorkspacesForUser } from "@/db/repositories/workspaces";

export const metadata = {
  title: "Dashboard — elf"
};

export default async function DashboardPage() {
  const session = await requireSession();
  const workspaces = await listWorkspacesForUser(session.user.id);

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="elf home">
            <Logo size={28} />
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

      <section className="px-6 py-16">
        <div className="mx-auto max-w-shell">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
            <div>
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
                your workspaces
              </p>
              <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight">
                {greeting(session.user.name)}
              </h1>
            </div>
            {workspaces.length > 0 && (
              <Button href="/workspaces/new" size="md">
                New workspace
              </Button>
            )}
          </div>

          {workspaces.length === 0 ? <EmptyState /> : <WorkspaceGrid workspaces={workspaces} />}
        </div>
      </section>
    </main>
  );
}

function greeting(name: string): string {
  const first = name.split(/\s+/)[0];
  return `Welcome back, ${first}.`;
}

function EmptyState() {
  return (
    <div className="border-hair rounded-card p-10 max-w-prose">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        no workspaces yet
      </p>
      <h2 className="text-xl text-elf-forest mb-2">
        Start with your first workspace.
      </h2>
      <p className="text-sm text-elf-muted leading-relaxed mb-6">
        Workspaces are the container for everything — projects, contributors,
        commits, treasury. Most teams start with one and add more as the work
        grows. Takes about thirty seconds.
      </p>
      <Button href="/workspaces/new" size="md">
        Create workspace
      </Button>
    </div>
  );
}

function WorkspaceGrid({
  workspaces
}: {
  workspaces: Awaited<ReturnType<typeof listWorkspacesForUser>>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workspaces.map((ws) => (
        <Link
          key={ws.id}
          href={`/workspaces/${ws.codename}`}
          className="block border-hair rounded-card p-6 hover:border-elf-deep transition-colors"
        >
          <p className="mono text-xs text-elf-muted mb-3">{ws.codename}</p>
          <h3 className="text-lg text-elf-forest leading-snug mb-2 truncate">
            {ws.displayName}
          </h3>
          <p className="text-xs text-elf-muted">
            {ws.plan} plan
            {ws.githubOrg && (
              <>
                {" · "}
                <span className="mono">{ws.githubOrg}</span>
              </>
            )}
          </p>
        </Link>
      ))}
    </div>
  );
}
