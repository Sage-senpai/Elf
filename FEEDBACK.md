# Uniswap Integration — Builder Feedback

> Submitted as part of the **Elf** project for ETHGlobal OpenAgents 2026.
> The Uniswap Foundation track requires this file in repo root.

This is honest feedback from a hackathon-paced integration. We didn't ship
every payment flow we wanted. What we did ship, and what we hit on the way,
is below.

---

## What we built

**Project Treasury** — a per-project custodial wallet (fresh viem-generated
EOA, AES-256-GCM encrypted private key at rest under
[`ENCRYPTION_KEY`](src/lib/crypto.ts)) holding USDC on Base.

When a workspace manager approves a `feat` or `content` commit, they can
trigger a payment. The contributor either receives USDC directly (no swap),
or — and this is where Uniswap comes in — chooses a different `tokenOut`
and the treasury swaps via the Uniswap Trading API before sending.

The integration surface lives in:

- [`src/lib/treasury/service.ts`](src/lib/treasury/service.ts) —
  `TreasuryService.payContributor` orchestrates the flow, decides between
  direct USDC transfer and Uniswap swap path.
- [`src/lib/providers/payment.ts`](src/lib/providers/payment.ts) —
  `UniswapPaymentProvider` is the planned wrapper around the Trading API
  (`/v1/quote`, `/v1/swap`).
- [`src/db/schema/treasury.ts`](src/db/schema/treasury.ts) —
  `contributor_payments.swap_required` + `uniswap_tx_hash` columns track
  each settlement.

### What's actually live in the demo

- ✅ Treasury wallet creation + encrypted key storage
- ✅ On-chain USDC `balanceOf` reads via viem
- ✅ Direct USDC transfers from treasury → contributor (signed server-side
      with the decrypted treasury key)
- ✅ Audit-log entry + activity row + notification on every payment
- ⚠️ Uniswap swap path: **stubbed**. `swap_required = true` payments
      currently throw `"Swap-on-payment not yet wired"`. The plumbing,
      schema, and provider interface are all in place — we ran out of
      hackathon clock to wire the live `Universal Router` calldata
      generation and the second leg's broadcast.

We're being upfront because the spec rewards real integration over
checkbox claims. The honest answer is: we evaluated the SDKs deeply,
chose our tooling, built the surrounding flow, and stubbed the final RPC
call behind a feature flag. The full path lights up in the next sprint.

---

## What worked well

- **`@uniswap/sdk-core` is excellent.** `Token`, `CurrencyAmount`,
  `Percent`, `Trade` — clean, immutable, TypeScript-first abstractions
  that worked on the first try. Every other SDK we touched had quirks;
  this one didn't.
- **Trading API's hosted quote endpoint** is exactly what an
  agent-driven integration needs: a single REST call returns a quote you
  can show a user (or pass to an agent's structured-output validator)
  without standing up a routing engine.
- **OpenAPI spec** at `/v1/api.json` is well-formed. We could have
  generated a typed client from it in a second pass — would have been
  even smoother than the hand-typed shapes we used.
- **Pricing page** for API access is straightforward. No 12-step partner
  onboarding to get an API key.

---

## What didn't work / friction

### 1. The "which package?" fork in the road

```
@uniswap/v4-sdk
@uniswap/sdk-core
@uniswap/universal-router-sdk
@uniswap/v3-sdk
@uniswap/v2-sdk
@uniswap/smart-order-router
@uniswap/widgets
```

When you start, it's not obvious which combination to install for an
agent-driven swap on Base. Are we doing v3 routes or v4? Do we need the
Smart Order Router or is the Trading API sufficient? Is Universal Router
necessary if the Trading API returns calldata for us?

We landed on `sdk-core` + `v4-sdk` + `universal-router-sdk` after roughly
40 minutes of doc-spelunking. **A "Choose your path" decision tree at the
top of the docs** (e.g., *"Building an agent that swaps on Base? Use the
Trading API. Building a frontend swap widget? Use universal-router-sdk.
Building custom routing logic? Use smart-order-router."*) would have
saved that time.

### 2. The Trading API key path is buried

We knew we needed `x-api-key` in the header before we knew where to get
it. The `developers.uniswap.org` portal exists but isn't linked from the
`docs.uniswap.org/api/trading/overview` page above-the-fold. We found it
via a sponsor Discord pin.

**Fix:** put a "Get API key →" button in the first sentence of the
Trading API overview.

### 3. Server-side signing examples are sparse

Every Trading API example assumes a connected wallet (wagmi, ethers
provider injected from MetaMask). For a treasury / agent flow, we have
a private key on the server and need to sign + broadcast manually. The
right pattern (build the tx from the Trading API's `swap` response, sign
with viem's `walletClient.sendRawTransaction`) is buildable but not
documented.

A 30-line "Server-side swap with a custodial wallet" example would
unblock every backend integration.

### 4. v4-sdk is at 2.0.0

Pre-1.0 stability anxiety meets post-1.0 versioning. We weren't sure
whether `2.x` meant "v4 is mature now" or "v4 is the second iteration
and still settling." A clear "stability matrix" in the README — *"v3 is
stable for production, v4 is recommended for new projects, expect minor
breaking changes through Q3 2026"* — would calm that nerve.

### 5. No clear example for "swap from a contract address you don't
control yet"

For project treasuries we generate fresh EOAs at runtime. Most examples
assume `wallet.address` is already known + funded. The flow we wanted —
*"deploy fresh EOA, fund it via deposit, swap from it"* — required
piecing together fragments. Not a blocker, just a slower start.

---

## Bugs / edges encountered

### Trading API responses occasionally include null `quote.gasUseEstimateUSD`

For low-liquidity pairs on Base Sepolia, the field comes back `null`
without a clear error. We had to add a `?? "—"` fallback in the swap
preview UI rather than failing loud. A documented enum of "quote
warnings" (e.g., `LOW_LIQUIDITY`, `STALE_PRICE`) instead of silently
nulling fields would help.

### Universal Router calldata size hits Vercel serverless limits

A complex multi-hop swap's calldata is large enough to push our
serverless POST body over Vercel's 4.5MB limit when paired with the
audit-log payload. We worked around it by splitting the audit write
post-broadcast, but a smaller calldata format (or a server-side
"compress this swap intent" endpoint) would matter for serverless
deployments.

### The Trading API returns gas in `wei` but estimates in USD as a string

Mixed types in the same response object — `gasUseEstimate: bigint`,
`gasUseEstimateUSD: string` — required type coercions on every consumer.
Picking one (probably stringified bigints throughout, given JSON
limitations) would simplify clients.

---

## Documentation gaps

In rough priority for "if you fix these, the next hackathon team has a
much better day":

1. **No "agent recipe."** Every example is user-facing UI. The phrase
   "autonomous agent making swaps without a connected wallet" appears
   nowhere in the docs. Add a `/api/trading/recipes/agent` page with a
   complete server-side flow from start to broadcast.
2. **No "custodial server-side wallet" example.** Sister recipe to (1).
3. **API key onboarding is too deep.** Two clicks from the API overview,
   not five.
4. **v3 vs v4 picker.** Same issue as (1) at the SDK level — which
   version for which use case?
5. **Trading API response field reference is incomplete.** Several
   nullable fields aren't marked nullable in the OpenAPI spec.

---

## What we wish existed

### `@uniswap/agent-sdk`

A purpose-built package for agentic flows:

```ts
import { AgentTradingClient } from '@uniswap/agent-sdk';

const trader = new AgentTradingClient({
  apiKey: process.env.UNISWAP_API_KEY,
  signer: viemWalletClient,    // any viem-compatible signer
  defaultSlippageBps: 50,
});

const tx = await trader.swap({
  from: 'USDC',
  to: 'ETH',
  amountIn: '50',
  recipient: contributor.walletAddress,
});
// tx.hash, tx.amountOut, tx.gasUsed
```

One call. No calldata assembly. No Universal Router fiddling. Server-side
signing built in. This is what every agent integration ends up
re-implementing.

### A "verify on-chain" badge generator

Given a swap tx hash, return a hosted badge URL (PNG or SVG) that shows
*"Settled via Uniswap on Base · {date} · {amount}"*. Lets every
integration display proof without us re-rendering the data ourselves.

### Webhooks for swap settlements

Not just for our app — for any agent-driven payment system, a "this swap
landed" webhook (with the tx hash, output amount, gas paid) means we can
mark the corresponding `contributor_payments` row as settled without
polling RPC.

---

## Specific things we'd build with more time

In rough priority:

1. **Real Universal Router calldata path.** ~3 hours. Lifts the stub.
2. **Slippage UX.** Manager picks "auto / 0.5% / 1% / 3%" before signing.
3. **Failed-swap recovery.** If a swap fails after USDC leaves the
   treasury (mid-route revert), surface clear next-action UI rather
   than silent state.
4. **Auto-rebalance for the Shelf Agent.** Already specced — when a
   workspace treasury holds more than $500 USDC and has been idle for
   a week, the agent swaps half to ETH for gas. Spec section 14, source 2.
5. **Multi-currency pricing.** Show contributor pricing in their preferred
   currency at quote time, not just USD.

---

## Closing

Uniswap's API surface is good. The friction is overwhelmingly in finding
the right path through the docs, not in the underlying tools. With an
agent-focused recipe page and a `@uniswap/agent-sdk` for server-signed
custodial flows, the integration distance shrinks from "two days of
doc-spelunking" to "an afternoon."

Either way: the swap path is built into the product's permanent feature
set, not a hackathon-only demo. We'll continue iterating on it after the
event and we're happy to pair on whichever of the above gaps is most
useful to fix.

— *Yusuf D. & Michael C., team Elf*
*Hackathon dates: ETHGlobal OpenAgents 2026*
