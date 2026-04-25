import Link from "next/link";
import type { Project } from "@/db/repositories/projects";
import { cn } from "@/lib/cn";

type Props = {
  workspaceCodename: string;
  projects: Project[];
};

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

export function ProjectGrid({ workspaceCodename, projects }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/workspaces/${workspaceCodename}/projects/${project.slug}`}
          className="block border-hair rounded-card p-6 hover:border-elf-deep transition-colors"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-lg text-elf-forest leading-snug truncate">
                {project.name}
              </h3>
              <p className="mono text-xs text-elf-muted truncate">{project.slug}</p>
            </div>
            <span
              className={cn(
                "shrink-0 mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge",
                statusTone[project.status] ?? statusTone.concept
              )}
            >
              {statusLabel[project.status] ?? project.status}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-elf-muted leading-relaxed line-clamp-3">
              {project.description}
            </p>
          )}
          {(project.stack ?? []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {(project.stack ?? []).slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge bg-elf-border/40 text-elf-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
