import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { Button } from "@/components/ui/Button";
import { CommitList } from "@/components/commits/CommitList";
import { QuickNoteForm } from "@/components/commits/QuickNoteForm";
import { CoworkLauncher } from "@/components/cowork/CoworkLauncher";
import { GithubLinkCard } from "@/components/github/GithubLinkCard";
import { RequestForkButton } from "@/components/forks/RequestForkButton";
import { AttachmentForm } from "@/components/attachments/AttachmentForm";
import { AttachmentList } from "@/components/attachments/AttachmentList";
import { ProjectMembersPanel } from "@/components/projects/ProjectMembersPanel";
import { listProjectMembers } from "@/db/repositories/permissions";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { findProjectBySlug } from "@/db/repositories/projects";
import { listProjectCommits } from "@/db/repositories/commits";
import { listProjectAttachments } from "@/db/repositories/attachments";
import { findUsersById } from "@/db/repositories/users";
import { cn } from "@/lib/cn";

type Props = {
  params: { codename: string; slug: string };
};

export async function generateMetadata({ params }: Props) {
  return { title: `${params.slug} — ${params.codename}` };
}

const statusLabel: Record<string, string> = {
  active: "Active",
  wip: "Work in progress",
  concept: "Concept",
  archived: "Archived"
};

const statusTone: Record<string, string> = {
  active: "bg-elf-mint text-elf-forest",
  wip: "bg-elf-deep/15 text-elf-deep",
  concept: "bg-elf-border/40 text-elf-muted",
  archived: "bg-elf-border/40 text-elf-muted"
};

export default async function ProjectPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const project = await findProjectBySlug(workspace.id, params.slug);
  if (!project) notFound();

  const [commits, projectAttachments, projectMembers] = await Promise.all([
    listProjectCommits(project.id, 30),
    listProjectAttachments(project.id, 30),
    role === "manager"
      ? listProjectMembers(workspace.id, project.id)
      : Promise.resolve([])
  ]);
  const authorIds = [
    ...commits.map((c) => c.authorId),
    ...projectAttachments.map((a) => a.addedBy)
  ];
  const authors = await findUsersById(authorIds);
  const canCommit = role !== "viewer";

  const noteCount = commits.filter(
    (c) => c.type === "content" || c.type === "docs"
  ).length;
  const codeCount = commits.length - noteCount;

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href={`/workspaces/${workspace.codename}`} className="flex items-center gap-3">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{workspace.codename}</span>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-ink">{project.slug}</span>
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
          <div className="flex items-start justify-between gap-6 flex-wrap mb-10">
            <div className="min-w-0">
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
                {project.niche || "project"}
              </p>
              <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-base md:text-lg text-elf-muted leading-relaxed max-w-prose">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={cn(
                  "shrink-0 mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-badge",
                  statusTone[project.status] ?? statusTone.concept
                )}
              >
                {statusLabel[project.status] ?? project.status}
              </span>
              <Button
                href={`/workspaces/${workspace.codename}/projects/${project.slug}/treasury`}
                variant="secondary"
                size="md"
              >
                Treasury
              </Button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-10">
              <div>
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg text-elf-forest">
                      {commits.length === 0
                        ? "No entries yet"
                        : commits.length === 1
                          ? "1 entry"
                          : `${commits.length} entries`}
                    </h2>
                    {commits.length > 0 && (
                      <p className="mono text-[11px] uppercase tracking-widest text-elf-muted mt-1">
                        {codeCount} commit{codeCount === 1 ? "" : "s"} ·{" "}
                        {noteCount} note{noteCount === 1 ? "" : "s"} ·{" "}
                        {projectAttachments.length} reference
                        {projectAttachments.length === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                  {canCommit && (
                    <Button
                      href={`/workspaces/${workspace.codename}/projects/${project.slug}/commits/new`}
                      variant="secondary"
                      size="md"
                    >
                      Full commit form →
                    </Button>
                  )}
                </div>

                {canCommit && (
                  <div className="mb-5">
                    <QuickNoteForm
                      codename={workspace.codename}
                      slug={project.slug}
                    />
                  </div>
                )}

                {commits.length === 0 ? (
                  <div className="border-hair rounded-card p-8">
                    <p className="text-sm text-elf-muted leading-relaxed mb-3">
                      Anyone on the team contributes here — devs ship commits,
                      writers post notes, designers drop refs. Everything lands
                      in the same audit log, in plain English.
                    </p>
                    {!canCommit && (
                      <p className="text-xs text-elf-muted">
                        Viewers read but don&apos;t post. Ask a manager to bump
                        your role if you want to contribute.
                      </p>
                    )}
                  </div>
                ) : (
                  <CommitList commits={commits} authorById={authors} />
                )}
              </div>

              {role === "manager" && projectMembers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                    <div>
                      <h2 className="text-lg text-elf-forest">
                        Project members
                      </h2>
                      <p className="mono text-[11px] uppercase tracking-widest text-elf-muted mt-1">
                        per-project role overrides · workspace defaults apply otherwise
                      </p>
                    </div>
                  </div>
                  <ProjectMembersPanel
                    codename={workspace.codename}
                    slug={project.slug}
                    initialMembers={projectMembers}
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg text-elf-forest">
                      References &amp; attachments
                    </h2>
                    <p className="mono text-[11px] uppercase tracking-widest text-elf-muted mt-1">
                      briefs · decks · figma · the original idea
                    </p>
                  </div>
                </div>
                {canCommit && (
                  <div className="mb-5">
                    <AttachmentForm
                      codename={workspace.codename}
                      slug={project.slug}
                    />
                  </div>
                )}
                <AttachmentList
                  codename={workspace.codename}
                  slug={project.slug}
                  attachments={projectAttachments}
                  authorById={authors}
                  canEdit={canCommit}
                />
              </div>
            </div>

            <aside className="space-y-6">
              <DetailCard title="Stack">
                {(project.stack ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(project.stack ?? []).map((s) => (
                      <span
                        key={s}
                        className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge bg-elf-border/40 text-elf-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-elf-muted">Add tech as you go.</p>
                )}
              </DetailCard>

              <GithubLinkCard
                codename={workspace.codename}
                slug={project.slug}
                initialRepo={project.githubRepo}
                canEdit={role === "manager" || role === "dev"}
              />

              {project.githubRepo && role !== "manager" && (
                <RequestForkButton
                  codename={workspace.codename}
                  slug={project.slug}
                />
              )}

              <DetailCard title="Preview">
                {project.previewUrl ? (
                  <a
                    href={project.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-elf-deep underline underline-offset-2 break-all"
                  >
                    {project.previewUrl}
                  </a>
                ) : (
                  <p className="text-sm text-elf-muted">No preview link yet.</p>
                )}
              </DetailCard>

              <DetailCard title="Created">
                <p className="text-sm text-elf-muted">
                  {new Date(project.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}
                </p>
              </DetailCard>
            </aside>
          </div>
        </div>
      </section>

      <CoworkLauncher codename={workspace.codename} slug={project.slug} />
    </main>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-hair rounded-card p-5">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}
