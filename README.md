# elf

> Leave it to elf. — cross-functional builder workspace with a decentralized stack.

Built for [ETHGlobal OpenAgents 2026](https://ethglobal.com/events/openagents).

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind**
- **Hono** mounted at `/api/[[...route]]/route.ts`
- **Drizzle ORM** + **PostgreSQL** (Supabase)
- **Better Auth** (GitHub OAuth + magic link) — to wire week 1
- **wagmi v3** + **viem** for wallet UI

### Decentralized partners (sponsor integrations)

- **0G Network** — Storage Log (audit), Storage KV (agent state), Compute (Shelf Agent inference). `@0glabs/0g-ts-sdk`, `@0glabs/0g-serving-broker`
- **Gensyn AXL** — encrypted P2P routing for Cowork. Local binary, HTTP API. *(Windows: mock transport via `AXL_TRANSPORT=mock`)*
- **KeeperHub** — guaranteed fork-approval execution + x402 agent payments. REST + MCP.
- **Uniswap** — contributor payments + treasury swaps via the hosted Trading API.
- **x402-fetch** — autonomous USDC payments for the Shelf Agent.

## Getting started

```bash
pnpm install
cp .env.example .env.local       # fill in keys when you have them
pnpm dev                          # http://localhost:3000
```

The landing page renders without any env vars set. API routes that touch the
database, partner SDKs, or wallets will throw clear errors until their env vars
are configured.

## Project layout

```
src/
  app/                       Next.js App Router
    api/[[...route]]/        single Hono entrypoint — all server routes
    layout.tsx               fonts + brand variables
    page.tsx                 landing
    globals.css              Elf brand tokens (warm white + forest)
  components/
    brand/                   Logo, wordmark
    landing/                 hero, stack, waitlist
    ui/                      Button, primitives
  db/
    schema/                  Drizzle tables (v1 + v2)
    client.ts                postgres-js + drizzle bootstrap
  lib/
    providers/               StorageProvider, ExecutionProvider,
                             MessagingProvider, PaymentProvider,
                             InferenceProvider — sacred interfaces, never
                             call sponsor SDKs outside these
  server/
    app.ts                   Hono app
    routes/                  health, waitlist, ...
```

## Provider rules (from spec section 3)

The five `lib/providers/*` interfaces are mandatory. Route handlers must
never import `@0glabs/...`, `@uniswap/...`, `x402-fetch`, KeeperHub REST,
or AXL bindings directly. Always go through the provider factory.

## Database

Schema is written but no live database is required to boot the app. To set
one up later:

```bash
# 1. Set DATABASE_URL in .env.local (Supabase or local Postgres)
# 2. Generate + push:
pnpm db:generate
pnpm db:push
# Or open the Drizzle Studio explorer:
pnpm db:studio
```

## Hackathon partners — where the wiring happens

| Partner    | Provider                          | File                                |
|------------|-----------------------------------|-------------------------------------|
| 0G Storage | `ZeroGStorageProvider`            | `src/lib/providers/storage.ts`      |
| 0G Compute | `ZeroGComputeInferenceProvider`   | `src/lib/providers/inference.ts`    |
| AXL        | `AxlBinaryMessagingProvider`      | `src/lib/providers/messaging.ts`    |
| KeeperHub  | `KeeperHubProvider`               | `src/lib/providers/execution.ts`    |
| Uniswap    | `UniswapPaymentProvider`          | `src/lib/providers/payment.ts`      |
| x402       | `makeAgentFetch`                  | `src/lib/providers/payment.ts`      |

Each provider currently throws `not yet wired` for the methods that touch
the network. Real implementations land in the sprints called out in the
spec (`prompt.md` section 19).

---

*Don't build by your shelf.*
