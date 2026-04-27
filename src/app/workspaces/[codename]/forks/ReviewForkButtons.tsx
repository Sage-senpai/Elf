"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | { kind: "idle" }
  | { kind: "confirm"; decision: "approved" | "rejected" }
  | { kind: "submitting"; decision: "approved" | "rejected" }
  | { kind: "result"; decision: "approved" | "rejected"; githubForkUrl?: string }
  | { kind: "error"; message: string };

/**
 * Two-step approval — the spec's hard rule. Step 1: click approve/reject.
 * Step 2: confirmation panel slides in with optional reviewer note,
 * deliberate "Confirm" button. The API also enforces { confirm: true }
 * server-side, so even a direct API call requires it.
 */
export function ReviewForkButtons({
  codename,
  forkId
}: {
  codename: string;
  forkId: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [note, setNote] = useState("");
  const router = useRouter();

  async function review(decision: "approved" | "rejected") {
    setStatus({ kind: "submitting", decision });
    try {
      const res = await fetch(`/api/workspaces/${codename}/forks/${forkId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision,
          confirm: true,
          reviewerNote: note || undefined
        })
      });
      const json = (await res.json()) as {
        githubForkUrl?: string;
        message?: string;
      };
      if (!res.ok) {
        setStatus({ kind: "error", message: json.message ?? `Failed (${res.status}).` });
        return;
      }
      setStatus({
        kind: "result",
        decision,
        githubForkUrl: json.githubForkUrl
      });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error."
      });
    }
  }

  if (status.kind === "result") {
    return (
      <div
        className={
          status.decision === "approved"
            ? "border-hair rounded-card p-4 bg-elf-mint/30 text-sm text-elf-forest"
            : "border-hair rounded-card p-4 text-sm text-elf-muted"
        }
      >
        {status.decision === "approved" ? "Approved." : "Rejected."}
        {status.githubForkUrl && (
          <a
            href={status.githubForkUrl}
            target="_blank"
            rel="noreferrer"
            className="block mono text-xs text-elf-deep underline underline-offset-2 mt-1.5 break-all"
          >
            {status.githubForkUrl}
          </a>
        )}
      </div>
    );
  }

  if (status.kind === "confirm") {
    const isApprove = status.decision === "approved";
    return (
      <div className="border-hair rounded-card p-4 space-y-3 bg-elf-warm-white">
        <p className="mono text-xs uppercase tracking-widest text-elf-mid">
          confirm {status.decision}
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={
            isApprove
              ? "Optional note for the requester."
              : "Why are you rejecting? (helpful for the requester.)"
          }
          className="w-full px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep resize-y"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => review(status.decision)}
            className={
              isApprove
                ? "inline-flex items-center justify-center h-9 px-4 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest"
                : "inline-flex items-center justify-center h-9 px-4 rounded-button bg-elf-ink text-elf-warm-white text-sm hover:bg-black"
            }
          >
            {isApprove ? "Yes, approve" : "Yes, reject"}
          </button>
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            className="text-sm text-elf-muted hover:text-elf-deep px-2"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (status.kind === "submitting") {
    return (
      <div className="text-sm text-elf-muted">
        {status.decision === "approved" ? "Approving…" : "Rejecting…"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setStatus({ kind: "confirm", decision: "approved" })}
          className="inline-flex items-center justify-center h-9 px-4 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setStatus({ kind: "confirm", decision: "rejected" })}
          className="inline-flex items-center justify-center h-9 px-4 rounded-button border-hair text-elf-ink text-sm hover:bg-elf-border/40"
        >
          Reject
        </button>
      </div>
      {status.kind === "error" && (
        <p className="text-xs text-red-700">{status.message}</p>
      )}
    </div>
  );
}
