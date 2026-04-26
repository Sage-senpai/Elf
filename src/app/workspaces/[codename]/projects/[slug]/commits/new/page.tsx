import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { findProjectBySlug } from "@/db/repositories/projects";
import { CreateCommitForm } from "./CreateCommitForm";

type Props = {
  params: { codename: string; slug: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `New commit — ${params.slug}` };
}

export default async function NewCommitPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const project = await findProjectBySlug(workspace.id, params.slug);
  if (!project) notFound();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b border-hair">
        <Link
          href={`/workspaces/${workspace.codename}/projects/${project.slug}`}
          className="inline-flex items-center gap-3"
          aria-label="back to project"
        >
          <Logo size={28} />
          <span className="text-elf-border">/</span>
          <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
          <span className="text-elf-border">/</span>
          <span className="mono text-sm text-elf-ink">{project.slug}</span>
        </Link>
      </header>

      <div className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
            new commit
          </p>
          <h1 className="display text-3xl text-elf-forest leading-tight mb-2">
            What changed in {project.name}?
          </h1>
          <p className="text-sm text-elf-muted mb-10">
            Pick a type, write a one-line summary, and add context if anyone
            who isn&apos;t you would benefit from it. Every commit lands in
            this project&apos;s permanent audit log.
          </p>

          <CreateCommitForm codename={workspace.codename} slug={project.slug} />
        </div>
      </div>
    </main>
  );
}
