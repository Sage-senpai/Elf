"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RunResult = {
  scanned: number;
  newlyStale: string[];
  alreadyStale: string[];
  notificationsSent: number;
  auditRootHash: string | null;
  onChainTxHash: string | null;
  ranAt: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: RunResult }
  | { kind: "error"; message: string };

export function RunAgentButton({ codename }: { codename: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [threshold, setThreshold] = useState(7);

  async function run() {
    setStatus({ kind: "running" });
    try {
      const res = await fetch(`/api/workspaces/${codename}/agent/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ staleThresholdDays: threshold })
      });
      const json = (await res.json()) as { result?: RunResult; message?: string };
      if (!res.ok || !json.result) {
        setStatus({ kind: "error", message: json.message ?? `Run failed (${res.status}).` });
        return;
      }
      setStatus({ kind: "done", result: json.result });
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error."
      });
    }
  }

  return (
    <div className="border-hair rounded-card p-7 md:p-8">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-1">
        run now
      </p>
      <h2 className="text-lg text-elf-forest mb-4">Trigger a manual scan.</h2>

      <label className="block mb-5">
        <span className="mono text-xs uppercase tracking-widest text-elf-muted">
          stale threshold (days)
        </span>
        <input
          type="number"
          min={1}
          max={90}
          value={threshold}
          onChange={(e) => setThreshold(Math.max(1, Math.min(90, Number(e.target.value) || 7)))}
          className="mt-2 w-32 h-11 px-3 rounded-input border-hair bg-elf-warm-white text-elf-ink focus:outline-none focus:border-elf-deep mono text-sm"
        />
        <span className="mt-1.5 block text-xs text-elf-muted">
          Projects with no commit in this many days get flagged.
        </span>
      </label>

      <button
        type="button"
        onClick={run}
        disabled={status.kind === "running"}
        className="inline-flex items-center justify-center h-10 px-4 rounded-button bg-elf-deep text-elf-on-brand text-sm hover:bg-elf-forest disabled:opacity-60"
      >
        {status.kind === "running" ? "Scanning…" : "Run agent"}
      </button>

      {status.kind === "done" && (
        <div className="mt-5 border-hair rounded-input p-4 bg-elf-mint/30 text-sm text-elf-forest space-y-1.5">
          <p>
            Scanned <strong>{status.result.scanned}</strong> project
            {status.result.scanned === 1 ? "" : "s"} ·
            flagged <strong>{status.result.newlyStale.length}</strong> newly stale ·
            sent <strong>{status.result.notificationsSent}</strong> notification
            {status.result.notificationsSent === 1 ? "" : "s"}.
          </p>
          {status.result.auditRootHash && (
            <p className="mono text-xs text-elf-deep break-all">
              audit: {status.result.auditRootHash}
              {status.result.auditRootHash.startsWith("mock_") && (
                <span className="ml-1 text-elf-muted">(local-only — set ZG_PRIVATE_KEY for on-chain anchor)</span>
              )}
            </p>
          )}
          {status.result.onChainTxHash ? (
            <p className="mono text-xs text-elf-deep break-all">
              tx: {status.result.onChainTxHash}
            </p>
          ) : (
            <p className="text-xs text-elf-muted">
              On-chain anchor skipped (set SHELF_AGENT_CONTRACT_ADDRESS +
              AGENT_WALLET_PRIVATE_KEY to enable).
            </p>
          )}
        </div>
      )}

      {status.kind === "error" && (
        <p className="mt-5 text-sm text-red-700 border-hair rounded-input p-3 bg-red-50">
          {status.message}
        </p>
      )}
    </div>
  );
}
