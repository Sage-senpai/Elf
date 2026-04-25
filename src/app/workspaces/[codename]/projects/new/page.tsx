import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { CreateProjectForm } from "./CreateProjectForm";

type Props = {
  params: { codename: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `New project — ${params.codename}` };
}

export default async function NewProjectPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b border-hair">
        <Link
          href={`/workspaces/${workspace.codename}`}
          className="inline-flex items-center gap-3"
          aria-label="back to workspace"
        >
          <Logo size={28} />
          <span className="text-elf-border">/</span>
          <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
        </Link>
      </header>

      <div className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-xl">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
            new project
          </p>
          <h1 className="display text-3xl text-elf-forest leading-tight mb-2">
            Add a project to {workspace.displayName}.
          </h1>
          <p className="text-sm text-elf-muted mb-10">
            Projects are anything you&apos;re building — code, content, a campaign.
            You can leave most fields blank and fill them in as you go.
          </p>

          <CreateProjectForm codename={workspace.codename} />
        </div>
      </div>
    </main>
  );
}
