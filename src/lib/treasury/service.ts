import "server-only";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatUnits,
  getContract,
  http,
  parseUnits
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decryptSecret } from "@/lib/crypto";
import {
  createTreasury,
  findTreasuryByProject,
  updateTreasuryBalance,
  createPayment,
  markPaymentSettled,
  markPaymentFailed,
  recordTreasuryTransaction,
  isExternalTreasury,
  type ProjectTreasury
} from "@/db/repositories/treasuries";

/**
 * TreasuryService — the single entrypoint for any code that needs to read
 * a treasury balance, accept a deposit address, or move money out. Per
 * spec section 3 (dev A): "All Uniswap swap calls go through the
 * TreasuryService abstraction — never raw contract calls from routes."
 *
 * This wraps:
 *   - viem for on-chain reads (USDC balanceOf)
 *   - the treasury repository for DB writes
 *   - the wallet decryption + signer construction
 *   - the future PaymentProvider for swaps (USDC -> any token via Uniswap)
 */

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

const base = defineChain({
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.base.org"] }
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://basescan.org" }
  }
});

const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] }
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://sepolia.basescan.org" }
  },
  testnet: true
});

function chainFor(chainId: number) {
  return chainId === 8453 ? base : baseSepolia;
}

function usdcFor(chainId: number): `0x${string}` {
  return chainId === 8453
    ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    : "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
}

/* -------------------------------------------------------------------------- */
/*  Treasury creation + lookup                                                */
/* -------------------------------------------------------------------------- */

export async function ensureTreasury(input: {
  workspaceId: string;
  projectId: string;
  externalWalletAddress?: `0x${string}` | null;
}): Promise<ProjectTreasury> {
  const existing = await findTreasuryByProject(input.projectId);
  if (existing) return existing;
  return createTreasury(input);
}

export { isExternalTreasury };

export async function getTreasuryForProject(
  projectId: string
): Promise<ProjectTreasury | null> {
  return findTreasuryByProject(projectId);
}

/* -------------------------------------------------------------------------- */
/*  On-chain balance read                                                     */
/* -------------------------------------------------------------------------- */

export type Balance = {
  raw: bigint;
  display: string; // e.g. "12.450000"
  symbol: "USDC";
  source: "chain" | "cache";
};

/**
 * Returns the live on-chain USDC balance and persists the cached value.
 * Falls back to the cached number (with `source: 'cache'`) if the RPC call
 * fails — the UI never blanks out because of a transient RPC blip.
 */
export async function getUsdcBalance(treasury: ProjectTreasury): Promise<Balance> {
  try {
    const client = createPublicClient({
      chain: chainFor(treasury.chainId),
      transport: http()
    });
    const raw = (await client.readContract({
      address: usdcFor(treasury.chainId),
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [treasury.walletAddress as `0x${string}`]
    })) as bigint;
    const display = formatUnits(raw, 6);
    await updateTreasuryBalance(treasury.id, display);
    return { raw, display, symbol: "USDC", source: "chain" };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[treasury] balance fetch failed, returning cache:", err);
    return {
      raw: parseUnits(String(treasury.usdcBalance ?? "0"), 6),
      display: String(treasury.usdcBalance ?? "0"),
      symbol: "USDC",
      source: "cache"
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Payments                                                                  */
/* -------------------------------------------------------------------------- */

export type PayContributorInput = {
  treasury: ProjectTreasury;
  recipientAddress: `0x${string}`;
  recipientUserId: string;
  amountUsdc: number;
  approvedBy: string;
  workspaceId: string;
  projectId: string;
  commitId?: string | null;
  /** When omitted, sends raw USDC. Otherwise we'd swap via Uniswap (later). */
  tokenOut?: string;
  tokenOutAddress?: `0x${string}`;
};

/**
 * Approves and immediately attempts a USDC transfer from the treasury to
 * the recipient address. Records the payment row first, then the on-chain
 * tx, then marks settled — so the audit trail is consistent even if the
 * tx itself reverts mid-flight.
 *
 * NOTE: pure USDC transfer for now. The Uniswap swap path lands in the
 * next commit alongside the real PaymentProvider wiring; for tokenOut !=
 * USDC this currently throws to make the missing path visible.
 */
export async function payContributor(
  input: PayContributorInput
): Promise<{ payment: Awaited<ReturnType<typeof createPayment>>; txHash?: string }> {
  if (isExternalTreasury(input.treasury)) {
    throw new Error(
      "This treasury is user-custodied. Send USDC directly from your connected wallet, then record the tx hash here."
    );
  }
  const tokenOut = (input.tokenOut ?? "USDC").toUpperCase();
  const swapRequired = tokenOut !== "USDC";

  const payment = await createPayment({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    treasuryId: input.treasury.id,
    recipientId: input.recipientUserId,
    commitId: input.commitId ?? null,
    amountUsdc: input.amountUsdc,
    tokenOut,
    tokenOutAddress: input.tokenOutAddress ?? null,
    swapRequired,
    approvedBy: input.approvedBy
  });

  if (swapRequired) {
    // Swap path placeholder — Uniswap wiring lands in the next commit.
    await markPaymentFailed(payment.id);
    throw new Error(
      "Swap-on-payment not yet wired. For now leave tokenOut as USDC."
    );
  }

  try {
    const privateKey = decryptSecret(input.treasury.encryptedPrivateKey) as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const wallet = createWalletClient({
      account,
      chain: chainFor(input.treasury.chainId),
      transport: http()
    });

    const usdc = getContract({
      address: usdcFor(input.treasury.chainId),
      abi: ERC20_ABI,
      client: wallet
    });

    const amount = parseUnits(String(input.amountUsdc), 6);
    const txHash = await usdc.write.transfer([input.recipientAddress, amount]);

    await markPaymentSettled(payment.id, txHash);
    await recordTreasuryTransaction({
      treasuryId: input.treasury.id,
      type: "payment",
      fromAddress: input.treasury.walletAddress,
      toAddress: input.recipientAddress,
      amountUsdc: String(input.amountUsdc),
      tokenIn: "USDC",
      tokenOut: "USDC",
      txHash,
      chainId: input.treasury.chainId,
      initiatedBy: input.approvedBy,
      notes: input.commitId ? `Commit ${input.commitId}` : null
    });

    return { payment, txHash };
  } catch (err) {
    await markPaymentFailed(payment.id);
    throw err;
  }
}
