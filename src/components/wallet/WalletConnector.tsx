"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Wallet {
  id: string;
  address: string;
  chainId: number;
  verified: boolean;
  primaryWallet: boolean;
}

export function WalletConnector() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's wallets on mount
  const loadWallets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wallets");
      if (!res.ok) throw new Error("Failed to load wallets");
      const { wallets: data } = await res.json();
      setWallets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Link a new wallet (placeholder for wagmi integration)
  const linkWallet = async () => {
    setLinking(true);
    setError(null);

    try {
      // TODO: Connect wallet using wagmi + MetaMask
      // For now, this is a placeholder. In production:
      // 1. Use useAccount() from wagmi to get connected wallet
      // 2. POST /api/wallets with chainId + address
      // 3. Use useSignMessage() to sign the returned message
      // 4. POST /api/wallets/:id/verify with signature

      alert(
        "Wallet linking requires wagmi setup. " +
          "See WalletConnector component for TODO."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link wallet");
    } finally {
      setLinking(false);
    }
  };

  const setPrimary = async (walletId: string) => {
    try {
      const res = await fetch(`/api/wallets/${walletId}/primary`, {
        method: "PATCH"
      });
      if (!res.ok) throw new Error("Failed to set primary wallet");
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const deleteWallet = async (walletId: string) => {
    if (!confirm("Remove this wallet?")) return;
    try {
      const res = await fetch(`/api/wallets/${walletId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete wallet");
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Button
          onClick={loadWallets}
          disabled={loading}
          variant="secondary"
          className="mb-4"
        >
          {loading ? "Loading..." : "Reload wallets"}
        </Button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {wallets.length === 0 ? (
        <p className="text-sm text-elf-muted">
          No wallets linked yet.{" "}
          <button onClick={linkWallet} className="text-elf-forest underline">
            Link your first wallet
          </button>
        </p>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center justify-between gap-4 p-3 border border-elf-border rounded-card"
            >
              <div className="min-w-0">
                <p className="mono text-xs text-elf-muted">Chain {wallet.chainId}</p>
                <p className="mono text-sm break-all">{wallet.address}</p>
                <p className="text-xs text-elf-muted mt-1">
                  {wallet.verified ? "✓ Verified" : "⚠ Not verified"}
                  {wallet.primaryWallet && " • Primary"}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {!wallet.primaryWallet && wallet.verified && (
                  <Button
                    onClick={() => setPrimary(wallet.id)}
                    variant="secondary"
                  >
                    Set primary
                  </Button>
                )}
                <Button
                  onClick={() => deleteWallet(wallet.id)}
                  variant="secondary"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-elf-border">
        <Button onClick={linkWallet} disabled={linking}>
          {linking ? "Linking..." : "Link new wallet"}
        </Button>
      </div>
    </div>
  );
}
