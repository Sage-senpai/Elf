import type { Commit } from "@/db/schema/projects";
import { getCommitTypeMeta } from "@/lib/commits";
import { cn } from "@/lib/cn";

type Props = {
  commits: Commit[];
  /** Optional author lookup so the row shows "Yusuf D." not just an id. */
  authorById?: Record<string, { name: string }>;
};

export function CommitList({ commits, authorById = {} }: Props) {
  return (
    <ol className="space-y-3">
      {commits.map((commit) => (
        <li key={commit.id}>
          <CommitRow commit={commit} author={authorById[commit.authorId]?.name} />
        </li>
      ))}
    </ol>
  );
}

export function CommitRow({
  commit,
  author
}: {
  commit: Commit;
  author?: string;
}) {
  const meta = getCommitTypeMeta(commit.type);
  return (
    <article className="border-hair rounded-card p-4 sm:p-5 bg-elf-warm-white">
      <div className="flex items-center gap-x-2 gap-y-1.5 mb-2.5 flex-wrap">
        <TypeBadge type={commit.type} breaking={commit.isBreaking} />
        {commit.scope && (
          <span className="mono text-xs text-elf-muted">{commit.scope}</span>
        )}
        <span className="text-elf-border hidden sm:inline">·</span>
        <span className="text-xs text-elf-ink">{author ?? "—"}</span>
        <span className="text-elf-border">·</span>
        <span className="text-xs text-elf-muted">{relative(commit.createdAt)}</span>
        {commit.githubSha && (
          <span className="sm:ml-auto mono text-xs text-elf-muted shrink-0">
            #{commit.githubSha.slice(0, 7)}
          </span>
        )}
      </div>
      <p className="text-elf-ink leading-snug mb-1.5">{commit.summary}</p>
      {commit.body && (
        <p className="text-sm text-elf-muted leading-relaxed whitespace-pre-line">
          {commit.body}
        </p>
      )}
      {meta && !commit.body && (
        <p className="text-xs text-elf-muted">{meta.hint}</p>
      )}
    </article>
  );
}

export function TypeBadge({
  type,
  breaking
}: {
  type: string;
  breaking?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "mono text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-badge",
          breaking ? "bg-elf-deep text-elf-warm-white" : "bg-elf-mint text-elf-forest"
        )}
      >
        {type}
      </span>
      {breaking && (
        <span
          title="Breaking change"
          className="mono text-[10px] uppercase tracking-widest text-elf-deep"
        >
          breaking
        </span>
      )}
    </span>
  );
}

function relative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
