"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | { kind: "idle" }
  | { kind: "open" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string }
  | { kind: "duplicate" };

export function RequestForkButton({
  codename,
  slug
}: {
  codename: string;
  slug: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [note, setNote] = useState("");
  const router = useRouter();

  async function submit() {
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/forks`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requesterNote: note || undefined })
        }
      );
      if (res.status === 409) {
        setStatus({ kind: "duplicate" });
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        setStatus({ kind: "error", message: json.message ?? `Request failed (${res.status}).` });
        return;
      }
      setStatus({ kind: "success" });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error."
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="border-hair rounded-card p-5 bg-elf-mint/30 text-sm text-elf-forest">
        Fork requested. A workspace manager will review it and you&apos;ll get
        a notification when they decide.
      </div>
    );
  }

  if (status.kind === "duplicate") {
    return (
      <div className="border-hair rounded-card p-5 text-sm text-elf-muted">
        You already have a pending fork request for this project.
      </div>
    );
  }

  if (status.kind === "open" || status.kind === "submitting") {
    return (
      <div className="border-hair rounded-card p-5 space-y-3">
        <p className="mono text-xs uppercase tracking-widest text-elf-mid">
          request a fork
        </p>
        <p className="text-sm text-elf-muted leading-relaxed">
          Get your own copy of the linked GitHub repo. A workspace manager
          has to approve it — managers can&apos;t accidentally approve, the
          flow requires a deliberate two-step.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Optional: what do you want to use the fork for?"
          className="w-full px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep resize-y"
          disabled={status.kind === "submitting"}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={status.kind === "submitting"}
            className="inline-flex items-center justify-center h-10 px-4 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest disabled:opacity-60"
          >
            {status.kind === "submitting" ? "Sending…" : "Send request"}
          </button>
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            disabled={status.kind === "submitting"}
            className="text-sm text-elf-muted hover:text-elf-deep px-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setStatus({ kind: "open" })}
        className="text-sm text-elf-deep underline underline-offset-2 hover:text-elf-forest"
      >
        Request a fork →
      </button>
      {status.kind === "error" && (
        <p className="text-xs text-red-700 mt-1.5">{status.message}</p>
      )}
    </div>
  );
}
