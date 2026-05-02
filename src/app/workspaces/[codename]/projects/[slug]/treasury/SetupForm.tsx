"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";

/**
 * Client-side treasury setup. Two flows:
 *
 *   1. Generate fresh wallet — server creates an EOA + AES-encrypts the
 *      key. Auto-payouts work; agent can spend; convenience-first.
 *
 *   2. Use connected wallet — server stores the address with an EXTERNAL
 *      sentinel and never holds the key. Manager signs payouts in their
 *      wallet. Self-custody-first.
 *
 * The previous implementation submitted a vanilla <form> POST and the
 * browser navigated to the JSON response — the screenshot the user sent
 * showing a raw JSON page. This component fetches and refreshes instead.
 */
export function SetupForm({
  codename,
  slug
}: {
  codename: string;
  slug: string;
}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const [busy, setBusy] = useState<"managed" | "external" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setup(externalWalletAddress?: string) {
    setBusy(externalWalletAddress ? "external" : "managed");
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/treasury`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            externalWalletAddress ? { externalWalletAddress } : {}
          )
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message || json.error || "Couldn't set up treasury.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="mono text-xs uppercase tracking-widest text-elf-mid">
          choose how this treasury holds funds
        </p>

        <button
          type="button"
          onClick={() => setup()}
          disabled={!!busy}
          className="w-full text-left border-hair rounded-card p-4 hover:border-elf-deep transition-colors disabled:opacity-60"
        >
          <p className="text-sm text-elf-forest font-medium mb-1">
            Generate a fresh wallet
          </p>
          <p className="text-xs text-elf-muted leading-relaxed">
            Elf creates a new EOA on Base Sepolia and encrypts the key at
            rest. The Shelf Agent can spend; payouts settle automatically
            with one click. Recommended for fast moving projects.
          </p>
          {busy === "managed" && (
            <p className="mono text-[10px] uppercase tracking-widest text-elf-deep mt-2">
              Spinning up wallet…
            </p>
          )}
        </button>

        <div className="border-hair rounded-card p-4">
          <p className="text-sm text-elf-forest font-medium mb-1">
            Use my connected wallet
          </p>
          <p className="text-xs text-elf-muted leading-relaxed mb-3">
            Self-custody. We store the address only — never the key.
            Payouts are signed in your wallet (MetaMask, Coinbase, etc).
            Auto-spend by agents is disabled.
          </p>

          {!isConnected ? (
            <div className="space-y-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  type="button"
                  onClick={() => connect({ connector })}
                  disabled={isConnecting}
                  className="h-9 px-3 mono text-xs uppercase tracking-widest rounded-button border-hair text-elf-ink hover:bg-elf-warm-white disabled:opacity-50"
                >
                  {isConnecting ? "Connecting…" : `Connect ${connector.name}`}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="mono text-[11px] text-elf-muted break-all">
                {address}
              </p>
              <button
                type="button"
                onClick={() => address && setup(address)}
                disabled={!!busy || !address}
                className="h-9 px-4 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest disabled:opacity-50"
              >
                {busy === "external"
                  ? "Linking…"
                  : "Use this wallet as the treasury"}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-700 border-hair rounded-input p-2.5 bg-red-50">
          {error}
        </p>
      )}
    </div>
  );
}
