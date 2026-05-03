"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Manager-only one-click demo helper. Lets you seed (add a populated
 * batch of commits, notes, references, treasury, payments) or wipe
 * (remove anything tagged as demo content) without dropping into a
 * database.
 *
 * The wipe path is conservative — it only deletes rows whose summaries,
 * titles, or tx hashes match the canned seed values, so a real commit
 * with similar text in a sibling project stays put.
 */
export function SeedDemoButton({
  codename,
  slug
}: {
  codename: string;
  slug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"seed" | "wipe" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "seed" | "wipe") {
    const message =
      action === "seed"
        ? "Seed demo content into this project? Adds commits, notes, references, a treasury, and settled payments."
        : "Wipe seeded demo content from this project? Removes seeded commits, notes, refs, and demo payments. Real content stays.";
    if (!confirm(message)) return;
    setBusy(action);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/demo/${action}`,
        { method: "POST" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message || json.error || `Couldn't ${action}.`);
        return;
      }
      const r = json.result ?? {};
      if (action === "seed") {
        setResult(
          `+${r.membersAdded ?? 0} teammates · +${r.commits ?? 0} commits · +${r.notes ?? 0} notes · +${r.attachments ?? 0} refs · +${r.payments ?? 0} payments${r.treasuryCreated ? " · treasury created" : ""}`
        );
      } else {
        setResult(
          `−${r.membersRemoved ?? 0} teammates · −${r.commits ?? 0} commits · −${r.notes ?? 0} notes · −${r.attachments ?? 0} refs · −${r.payments ?? 0} payments · −${r.transactions ?? 0} txs`
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-hair rounded-card p-4 bg-amber-50/50">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="mono text-[10px] uppercase tracking-widest text-amber-800 mb-1">
            demo helper · manager-only
          </p>
          <p className="text-xs text-elf-muted leading-relaxed">
            Populate this project with sample commits, notes, references, a
            treasury, and settled payments — or wipe seeded content when
            you&apos;re done recording. Real commits and payouts stay.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => run("seed")}
            disabled={!!busy}
            className="h-9 px-4 rounded-button bg-amber-600 text-elf-warm-white text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {busy === "seed" ? "Seeding…" : "Seed demo data"}
          </button>
          <button
            type="button"
            onClick={() => run("wipe")}
            disabled={!!busy}
            className="h-9 px-3 mono text-[10px] uppercase tracking-widest rounded-button border-hair text-elf-muted hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {busy === "wipe" ? "Wiping…" : "Wipe"}
          </button>
        </div>
      </div>
      {result && (
        <p className="mono text-[11px] text-elf-forest mt-3">{result}</p>
      )}
      {error && (
        <p className="text-xs text-red-700 mt-3">{error}</p>
      )}
    </div>
  );
}
