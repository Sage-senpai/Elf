import Link from "next/link";
import type { Activity } from "@/db/schema/activity";
import { cn } from "@/lib/cn";

type Props = {
  workspaceCodename: string;
  activity: Activity[];
  authorById?: Record<string, { name: string }>;
  /** Cap how many rows render. Used by the workspace-home preview. */
  limit?: number;
};

export function ActivityFeed({
  workspaceCodename,
  activity,
  authorById = {},
  limit
}: Props) {
  const rows = limit ? activity.slice(0, limit) : activity;
  return (
    <ol className="relative space-y-4">
      {rows.map((row, i) => (
        <ActivityRow
          key={row.id}
          activity={row}
          actor={row.actorId ? authorById[row.actorId]?.name : undefined}
          workspaceCodename={workspaceCodename}
          isLast={i === rows.length - 1}
        />
      ))}
    </ol>
  );
}

type RowProps = {
  activity: Activity;
  actor?: string;
  workspaceCodename: string;
  isLast?: boolean;
};

function ActivityRow({ activity, actor, workspaceCodename, isLast }: RowProps) {
  const desc = describe(activity);
  const link = linkFor(activity, workspaceCodename);

  return (
    <li className="relative pl-8">
      {/* timeline rail */}
      <span
        className={cn(
          "absolute left-3 top-1.5 bottom-0 w-px bg-elf-border",
          isLast && "bottom-auto h-0"
        )}
        aria-hidden="true"
      />
      <span
        className="absolute left-1.5 top-2 w-3 h-3 rounded-full bg-elf-mint border border-elf-deep/30"
        aria-hidden="true"
      />
      <div>
        <p className="text-sm text-elf-ink leading-snug">
          <span className="text-elf-forest">{actor ?? "Someone"}</span>{" "}
          {desc.verb}{" "}
          {link ? (
            <Link href={link} className="text-elf-deep underline underline-offset-2">
              {desc.target}
            </Link>
          ) : (
            <span className="text-elf-ink">{desc.target}</span>
          )}
          {desc.suffix && <span className="text-elf-muted">{desc.suffix}</span>}
        </p>
        <p className="mono text-xs text-elf-muted mt-1">
          {new Date(activity.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })}
        </p>
      </div>
    </li>
  );
}

type Description = { verb: string; target: string; suffix?: string };

function describe(activity: Activity): Description {
  const p = (activity.payload ?? {}) as Record<string, unknown>;
  switch (activity.type) {
    case "workspace.created":
      return { verb: "created the workspace", target: String(p.display_name ?? "—") };
    case "project.created":
      return { verb: "added the project", target: String(p.name ?? p.slug ?? "—") };
    case "project.status_changed":
      return {
        verb: "changed project status to",
        target: String(p.status ?? "—")
      };
    case "commit.created": {
      const type = String(p.type ?? "commit");
      const breaking = p.is_breaking ? " · breaking" : "";
      return {
        verb: `pushed a ${type} commit`,
        target: String(p.summary ?? "—"),
        suffix: breaking
      };
    }
    case "fork.requested":
      return { verb: "requested a fork of", target: String(p.project_name ?? "a project") };
    case "fork.approved":
      return { verb: "approved a fork request", target: "" };
    case "fork.rejected":
      return { verb: "rejected a fork request", target: "" };
    case "member.invited":
      return { verb: "invited", target: String(p.email ?? "a contributor") };
    case "member.joined":
      return { verb: "joined the workspace", target: "" };
    case "cowork.session_started":
      return { verb: "opened a Cowork session on", target: String(p.project_name ?? "—") };
    case "attachment.added":
      return { verb: "attached", target: String(p.title ?? p.url ?? "—") };
    case "payment.created":
      return { verb: "queued a payment of", target: `${p.amount_usdc ?? "?"} USDC` };
    case "payment.settled":
      return { verb: "settled a payment of", target: `${p.amount_usdc ?? "?"} USDC` };
    case "agent.action":
      return { verb: "the Shelf Agent ran an action", target: String(p.note ?? "") };
    default:
      return { verb: activity.type, target: "" };
  }
}

function linkFor(activity: Activity, codename: string): string | null {
  const p = (activity.payload ?? {}) as Record<string, unknown>;
  const slug = p.slug ?? p.project_slug;
  if (slug && typeof slug === "string") {
    return `/workspaces/${codename}/projects/${slug}`;
  }
  if (activity.type === "workspace.created") {
    return `/workspaces/${codename}`;
  }
  return null;
}
