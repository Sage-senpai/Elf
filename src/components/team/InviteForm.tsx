"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "manager" | "dev" | "content" | "viewer";

const ROLE_HINTS: Record<Role, string> = {
  manager: "Full control. Approves forks, manages members, moves treasury.",
  dev: "Pushes commits, opens fork requests, runs Cowork.",
  content: "Adds attachments + content commits. No code push.",
  viewer: "Read-only. Sees commits, audit, activity. No writes."
};

export function InviteForm({
  workspaceCodename
}: {
  workspaceCodename: string;
}) {
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<Role>("dev");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ link: string; matchedBy: string } | null>(
    null
  );
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceCodename}/invites`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ identifier: identifier.trim(), role })
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json.message ||
            (json.error === "unknown_identifier"
              ? "We couldn't find that user."
              : json.error === "forbidden"
                ? "Only managers can invite."
                : "Invite failed.")
        );
        return;
      }
      setSuccess({ link: json.link, matchedBy: json.matchedBy });
      setIdentifier("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.link);
    } catch {
      /* ignore */
    }
  }

  return (
    <form onSubmit={submit} className="border-hair rounded-card p-5 space-y-4">
      <div>
        <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
          invite a member
        </p>
        <label
          htmlFor="invite-identifier"
          className="block text-xs text-elf-muted mb-1.5"
        >
          Email or @username
        </label>
        <input
          id="invite-identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="alex@example.com  ·  @alex"
          autoComplete="off"
          className="w-full px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
        />
      </div>

      <div>
        <label className="block text-xs text-elf-muted mb-1.5">Role</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["manager", "dev", "content", "viewer"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={
                "h-9 px-3 rounded-button text-xs mono uppercase tracking-widest transition-colors " +
                (role === r
                  ? "bg-elf-deep text-elf-on-brand"
                  : "border-hair text-elf-ink hover:bg-elf-warm-white")
              }
            >
              {r}
            </button>
          ))}
        </div>
        <p className="text-xs text-elf-muted mt-2 leading-relaxed">
          {ROLE_HINTS[role]}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-700 border-hair rounded-input p-2.5 bg-red-50">
          {error}
        </p>
      )}

      {success && (
        <div className="text-xs border-hair rounded-input p-3 bg-elf-mint/15 space-y-2">
          <p className="text-elf-forest">
            Invite created
            {success.matchedBy === "username"
              ? " — matched a registered @username."
              : "."}{" "}
            Share the link below with them. It works for 7 days.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 mono text-[11px] text-elf-ink truncate bg-elf-warm-white border-hair rounded-input px-2 py-1.5">
              {success.link}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 mono text-[10px] uppercase tracking-widest px-2 py-1.5 rounded-button bg-elf-deep text-elf-on-brand hover:bg-elf-forest"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !identifier.trim()}
          className="h-10 px-4 rounded-button bg-elf-deep text-elf-on-brand text-sm hover:bg-elf-forest disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send invite"}
        </button>
      </div>
    </form>
  );
}
