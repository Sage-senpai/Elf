"use client";

import { useState } from "react";

const baseUSDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const baseSepoliaUSDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export function DepositCard({
  walletAddress,
  chainId
}: {
  walletAddress: string;
  chainId: number;
}) {
  const [copied, setCopied] = useState(false);
  const usdc = chainId === 8453 ? baseUSDC : baseSepoliaUSDC;
  const network = chainId === 8453 ? "Base mainnet" : "Base Sepolia (testnet)";

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="border-hair rounded-card p-5">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        deposit
      </p>
      <p className="text-sm text-elf-muted leading-relaxed mb-4">
        Send USDC to the treasury address on{" "}
        <span className="text-elf-ink">{network}</span>. Balance updates within
        a few seconds of confirmation.
      </p>
      <button
        type="button"
        onClick={() => copy(walletAddress)}
        className="w-full text-left mono text-xs text-elf-ink break-all border-hair rounded-input px-3 py-2.5 hover:border-elf-deep transition-colors"
        title="Click to copy"
      >
        {walletAddress}
      </button>
      <p className="mono text-[11px] text-elf-muted mt-2">
        {copied ? "copied ✓" : "click to copy"}
      </p>
      <p className="mono text-[11px] text-elf-muted mt-4 break-all">
        USDC contract: {usdc}
      </p>
    </div>
  );
}
