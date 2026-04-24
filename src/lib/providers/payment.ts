/**
 * PaymentProvider — settles value on-chain.
 *
 * Real impls:
 *  - UniswapPaymentProvider   — quote + swap via the hosted Trading API
 *  - X402PaymentProvider      — autonomous agent payments via x402-fetch
 *
 * Spec rule: the TreasuryService is the ONLY caller of these in route
 * handlers. Never invoke a Uniswap or x402 SDK directly from a route.
 */

export type SwapQuote = {
  amountIn: string; // decimal string in USDC units (6 decimals)
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
  estimatedGasUsd: string;
  /** Opaque payload to feed back into executeSwap. */
  raw: unknown;
};

export type SwapRequest = {
  amountUsdc: number;
  tokenOutAddress: string;
  recipient: string;
  treasuryWallet: string;
  chainId: number;
};

export interface PaymentProvider {
  readonly kind: "uniswap" | "x402";
  quote(req: SwapRequest): Promise<SwapQuote>;
  executeSwap(quote: SwapQuote, recipient: string): Promise<{ txHash: string }>;
}

/* -------------------------------------------------------------------------- */
/*  Uniswap — contributor payments + treasury rebalance                       */
/* -------------------------------------------------------------------------- */
class UniswapPaymentProvider implements PaymentProvider {
  readonly kind = "uniswap" as const;

  constructor(
    private readonly apiUrl = process.env.UNISWAP_API_URL ?? "https://trade-api.gateway.uniswap.org",
    private readonly apiKey = process.env.UNISWAP_API_KEY ?? "",
    private readonly chainId = Number(process.env.UNISWAP_CHAIN_ID ?? 84532)
  ) {}

  // Base mainnet vs Sepolia USDC
  private get usdc(): string {
    return this.chainId === 8453
      ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      : "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  }

  async quote(req: SwapRequest): Promise<SwapQuote> {
    if (!this.apiKey) throw new Error("UNISWAP_API_KEY not set.");
    const res = await fetch(`${this.apiUrl}/v1/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: JSON.stringify({
        tokenInChainId: req.chainId,
        tokenIn: this.usdc,
        tokenOutChainId: req.chainId,
        tokenOut: req.tokenOutAddress,
        amount: String(Math.floor(req.amountUsdc * 1e6)),
        type: "EXACT_INPUT",
        swapper: req.treasuryWallet
      })
    });
    if (!res.ok) throw new Error(`uniswap quote failed: ${res.status}`);
    const data = (await res.json()) as Record<string, unknown>;
    return {
      amountIn: String(Math.floor(req.amountUsdc * 1e6)),
      amountOut: String((data.quote as { output?: { amount?: string } })?.output?.amount ?? "0"),
      tokenIn: this.usdc,
      tokenOut: req.tokenOutAddress,
      estimatedGasUsd: String((data.quote as { gasFeeUSD?: string })?.gasFeeUSD ?? "?"),
      raw: data
    };
  }

  async executeSwap(_quote: SwapQuote, _recipient: string): Promise<{ txHash: string }> {
    // TODO: POST /v1/swap with the quote payload, sign with TREASURY_MASTER_WALLET.
    throw new Error("UniswapPaymentProvider.executeSwap not yet wired (sprint week 7).");
  }
}

/* -------------------------------------------------------------------------- */
/*  x402 — autonomous agent payments (Shelf Agent → 0G Compute, etc.)         */
/* -------------------------------------------------------------------------- */
class X402PaymentProvider implements PaymentProvider {
  readonly kind = "x402" as const;

  async quote(_req: SwapRequest): Promise<SwapQuote> {
    throw new Error("X402PaymentProvider does not support swap quotes — use Uniswap.");
  }

  async executeSwap(_quote: SwapQuote, _recipient: string): Promise<{ txHash: string }> {
    throw new Error("X402PaymentProvider does not execute swaps — use Uniswap.");
  }
}

/**
 * Wrap any fetch with x402-fetch interceptor for autonomous USDC payments.
 * Used by the Shelf Agent to pay for its own 0G Compute inference.
 *
 * Lazy import to avoid loading x402-fetch in client bundles.
 */
export async function makeAgentFetch(): Promise<typeof fetch> {
  if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
    throw new Error("AGENT_WALLET_PRIVATE_KEY not set — Shelf Agent cannot pay.");
  }
  // TODO: import { withPaymentInterceptor } from 'x402-fetch'
  //       const signer = privateKeyToAccount(AGENT_WALLET_PRIVATE_KEY)
  //       return withPaymentInterceptor(fetch, signer)
  throw new Error("makeAgentFetch not yet wired (sprint week 7).");
}

export function getPaymentProvider(kind: "uniswap" | "x402" = "uniswap"): PaymentProvider {
  return kind === "x402" ? new X402PaymentProvider() : new UniswapPaymentProvider();
}
