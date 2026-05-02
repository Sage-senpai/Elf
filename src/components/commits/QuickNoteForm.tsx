"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * QuickNoteForm — the non-dev contribution surface. Anyone in the workspace
 * (except viewers) can drop a thought, brief excerpt, decision, or note in
 * plain English. Persisted as a `content` commit so it shares the project's
 * audit trail with code changes; markdown is preserved in the body.
 *
 * The full CommitForm still exists for devs who want type/scope/breaking
 * controls — this is the "writers' lane" version.
 */
export function QuickNoteForm({
  codename,
  slug
}: {
  codename: string;
  slug: string;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/commits`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "content",
            summary: summary.trim().slice(0, 72),
            body: body.trim() || undefined,
            isBreaking: false
          })
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message || json.error || "Couldn't post note.");
        return;
      }
      setSummary("");
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-hair rounded-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge bg-elf-mint text-elf-forest">
          content
        </span>
        <span className="mono text-[10px] uppercase tracking-widest text-elf-muted">
          quick note · for everyone
        </span>
      </div>
      <input
        type="text"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="One-liner — the thought, the change, the decision."
        maxLength={72}
        className="w-full px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Optional details. Markdown works — paste the brief, the references, the back-and-forth."
        rows={3}
        className="w-full px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep resize-y"
      />
      {error && (
        <p className="text-xs text-red-700 border-hair rounded-input p-2 bg-red-50">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || !summary.trim()}
          className="h-9 px-4 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest disabled:opacity-50"
        >
          {busy ? "Posting…" : "Post note"}
        </button>
      </div>
    </form>
  );
}
