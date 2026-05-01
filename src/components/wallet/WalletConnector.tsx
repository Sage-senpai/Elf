"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSignMessage
} from "wagmi";
import { Button } from "@/components/ui/Button";

interface Wallet {
  id: string;
  address: string;
  chainId: number;
  verified: boolean;
  primaryWallet: boolean;
}

export function WalletConnector() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

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

  useEffect(() => {
    loadWallets();
  }, []);

  const linkWallet = async () => {
    if (!address) {
      setError("Connect your wallet first.");
      return;
    }
    setLinking(true);
    setError(null);
    setStatus("Requesting verification message…");

    try {
      // 1. Ask backend for the message to sign
      const linkRes = await fetch("/api/wallets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chainId, address })
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) {
        throw new Error(linkData.reason ?? linkData.error ?? "Could not start linking");
      }
      const { wallet, messageToSign } = linkData;

      // 2. Sign with the wallet (MetaMask popup)
      setStatus("Sign the message in your wallet…");
      const signature = await signMessageAsync({ message: messageToSign });

      // 3. Send signature back for verification
      setStatus("Verifying signature…");
      const verifyRes = await fetch(`/api/wallets/${wallet.id}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: messageToSign, signature })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        throw new Error(verifyData.reason ?? "Verification failed");
      }

      setStatus("Wallet linked!");
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link wallet");
      setStatus(null);
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

  const removeWallet = async (walletId: string) => {
    if (!confirm("Remove this wallet from your account?")) return;
    try {
      const res = await fetch(`/api/wallets/${walletId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove wallet");
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {!isConnected ? (
          <div className="space-y-2">
            <p className="text-sm text-elf-muted">
              Connect a wallet (MetaMask, Coinbase, etc.) to link it to your account.
            </p>
            {connectors.map((connector) => (
              <Button
                key={connector.uid}
                onClick={() => connect({ connector })}
                disabled={isConnecting}
                variant="secondary"
              >
                {isConnecting ? "Connecting…" : `Connect ${connector.name}`}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-elf-muted">Connected:</p>
            <p className="mono text-sm break-all">{address}</p>
            <p className="text-xs text-elf-muted">Chain ID: {chainId}</p>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={linkWallet} disabled={linking}>
                {linking ? "Linking…" : "Link this wallet"}
              </Button>
              <Button onClick={() => disconnect()} variant="secondary">
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>

      {status && <p className="text-sm text-elf-muted">{status}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="pt-4 border-t border-elf-border">
        <p className="mono text-xs uppercase tracking-widest text-elf-muted mb-3">
          Linked wallets
        </p>
        {loading ? (
          <p className="text-sm text-elf-muted">Loading…</p>
        ) : wallets.length === 0 ? (
          <p className="text-sm text-elf-muted">
            No wallets linked yet. Linked wallets work across GitHub and email
            sign-in.
          </p>
        ) : (
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between gap-4 p-3 border border-elf-border rounded-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="mono text-xs text-elf-muted">
                    Chain {wallet.chainId}
                  </p>
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
                    onClick={() => removeWallet(wallet.id)}
                    variant="secondary"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
