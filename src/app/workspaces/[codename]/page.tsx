import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "@/components/auth/UserMenu";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";

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

  // Membership gate. Visitors who aren't members get a 404 (don't leak existence).
  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" aria-label="elf">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
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

      <section className="px-6 py-16">
        <div className="mx-auto max-w-shell">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            {role}
          </p>
          <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
            {workspace.displayName}
          </h1>
          <p className="text-sm text-elf-muted mb-12">
            Workspace codename:{" "}
            <span className="mono text-elf-ink">{workspace.codename}</span>
            {workspace.githubOrg && (
              <>
                {" · GitHub: "}
                <span className="mono text-elf-ink">{workspace.githubOrg}</span>
              </>
            )}
          </p>

          <div className="border-hair rounded-card p-8 max-w-prose">
            <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
              your shelf is empty
            </p>
            <h2 className="text-xl text-elf-forest mb-2">
              Add your first project.
            </h2>
            <p className="text-sm text-elf-muted leading-relaxed mb-6">
              A project is anything you&apos;re building — an app, a doc set,
              a campaign. You can link a GitHub repo or start without one
              and link later.
            </p>
            <Link
              href={`/workspaces/${workspace.codename}/projects/new`}
              className="inline-flex items-center justify-center h-10 px-4 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest"
            >
              Add a project
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
