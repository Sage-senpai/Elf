"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Role = "manager" | "dev" | "content" | "viewer";

type Member = {
  userId: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  workspaceRole: Role;
  overrideRole: Role | null;
  effectiveRole: Role;
};

const ROLES: Role[] = ["manager", "dev", "content", "viewer"];

const ROLE_TONE: Record<Role, string> = {
  manager: "bg-elf-deep text-elf-on-brand",
  dev: "bg-elf-mint text-elf-forest",
  content: "bg-amber-100 text-amber-800",
  viewer: "bg-elf-border/40 text-elf-muted"
};

/**
 * Per-project membership grid for managers. Lists every workspace member
 * with their effective role on this project and lets the manager:
 *  - bump someone up (e.g. promote a workspace dev to project manager)
 *  - tone someone down (workspace manager but viewer on this project)
 *  - reset back to the workspace default
 *
 * Renders inline on the project page; non-managers don't see this surface
 * at all (controlled by the parent server component).
 */
export function ProjectMembersPanel({
  codename,
  slug,
  initialMembers
}: {
  codename: string;
  slug: string;
  initialMembers: Member[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setRole(userId: string, role: Role) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/permissions/${userId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role })
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Couldn't update role.");
        return;
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId
            ? { ...m, overrideRole: role, effectiveRole: role }
            : m
        )
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function clearOverride(userId: string) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/permissions/${userId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Couldn't clear override.");
        return;
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId
            ? { ...m, overrideRole: null, effectiveRole: m.workspaceRole }
            : m
        )
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-hair border-hair rounded-card">
        {members.map((m) => {
          const overridden = m.overrideRole !== null;
          return (
            <li
              key={m.userId}
              className="px-4 py-3 flex items-center gap-3 flex-wrap"
            >
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image}
                  alt=""
                  className="w-7 h-7 rounded-full border-hair shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-elf-mint/40 flex items-center justify-center text-[10px] mono text-elf-forest shrink-0">
                  {m.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-elf-ink truncate">
                  {m.name}
                  {m.username && (
                    <span className="text-elf-muted mono text-xs ml-1.5">
                      @{m.username}
                    </span>
                  )}
                </p>
                <p className="mono text-[10px] uppercase tracking-widest text-elf-muted mt-0.5">
                  workspace: {m.workspaceRole}
                  {overridden && (
                    <span className="text-elf-deep">
                      {" · project override"}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={busyId === m.userId}
                    onClick={() => setRole(m.userId, r)}
                    aria-pressed={m.effectiveRole === r}
                    className={cn(
                      "mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge transition-colors disabled:opacity-50",
                      m.effectiveRole === r
                        ? ROLE_TONE[r]
                        : "bg-transparent border-hair text-elf-muted hover:bg-elf-warm-white"
                    )}
                  >
                    {r}
                  </button>
                ))}
                {overridden && (
                  <button
                    type="button"
                    disabled={busyId === m.userId}
                    onClick={() => clearOverride(m.userId)}
                    className="mono text-[10px] uppercase tracking-widest text-elf-muted hover:text-elf-deep underline underline-offset-2 disabled:opacity-50"
                  >
                    reset
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="text-xs text-red-700 border-hair rounded-input p-2.5 bg-red-50">
          {error}
        </p>
      )}
      <p className="text-xs text-elf-muted leading-relaxed">
        Click a role to override what this member sees on this project. Use{" "}
        <span className="mono">reset</span> to drop them back to their
        workspace default. Workspace-level roles still apply across every
        other project.
      </p>
    </div>
  );
}
