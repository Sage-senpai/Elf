# elf

> **Leave it to elf.** A cross-functional builder workspace where developers
> commit code, content contributors add docs and decks, and managers control
> who sees, touches, or forks anything — without anyone leaving the platform
> or switching apps.

Every great product needs an elf.

---

## What this is

The fragmentation of mixed teams kills launches. Devs live in GitHub. Writers
live in Notion. Managers live in Slack. When a developer ships a feature, the
content writer finds out three days later in a message that says *"hey can you
write copy for the thing I built."* Elf is the workspace layer on top of
GitHub (and GitLab and Bitbucket) where everyone can see, contribute to, and
gate the same project — in the language they actually speak.

The commit system bridges both worlds. Every commit has a type
(`feat`, `fix`, `audit`, `ref`, `content`, ...), a one-line summary, and a
plain-English subcaption that explains the *why* — not just the what. When a
dev pushes a feature, the content writer sees:

> **Yusuf added quiz scoring.** Students now get instant results.

Not a SHA. Not a diff.

---

## How it works

| Role          | What they see                                                     |
|---------------|-------------------------------------------------------------------|
| **Developer** | Commits push from GitHub. Cowork chat for AI pair-programming. Same git workflow as today. |
| **Writer**    | Project shelf with attachments, commit summaries in plain English, deliberate fork-request flow. No terminal, no SHAs. |
| **Manager**   | Per-project, per-member permissions. Activity feed across every project. Two-step approval on every fork request. |

---

## The decentralized stack

Elf's user-facing product is web. The pieces that *matter* — your audit log,
your contributor payments, your team's private conversations — don't depend
on Elf staying online to read them back.

| Layer | What it does | Built on |
|---|---|---|
| **Permanent record** | Every commit, fork approval, and contributor payment is content-addressed and tamper-proof | [0G Storage Log](https://docs.0g.ai) — ZgFile + Indexer |
| **Encrypted collaboration** | Multi-party Cowork sessions route through an encrypted peer-to-peer mesh | [Gensyn AXL](https://blog.gensyn.ai/introducing-axl/) |
| **Guaranteed execution** | Fork approvals execute through a guaranteed-delivery layer with retries + audit | [KeeperHub](https://keeperhub.com) (interface ready, REST endpoint pending) |
| **Trustless payments** | Project treasuries hold USDC. Approve a commit, contributor gets paid | [Uniswap Trading API](https://docs.uniswap.org/api/trading/overview) + viem-direct USDC transfers |
| **Autonomous agent** | Shelf Agent monitors workspaces, anchors runs on-chain, pays for its own compute | [0G Compute Network](https://docs.0g.ai) + [`x402-fetch`](https://www.npmjs.com/package/x402-fetch) |
| **Smart contract** | `ShelfAgentStateManager` records each agent run on-chain | 0G Galileo Testnet (chain id 16602) |

Live deployment of `ShelfAgentStateManager`:
[`0x220bfc37cf1ce6707b98a5e905375c1dbc4b0c2a`](https://chainscan-galileo.0g.ai/address/0x220bfc37cf1ce6707b98a5e905375c1dbc4b0c2a)

---

## Tech stack

```
Frontend       Next.js 14 App Router · TypeScript strict · Tailwind 3
Backend        Hono mounted at app/api/[[...route]]/route.ts
Database       PostgreSQL 16 (Supabase) via Drizzle ORM + postgres-js
Auth           Better Auth (GitHub OAuth + magic link via Resend)
AI             Anthropic Claude (Cowork) · 0G Compute (Shelf Agent inference)
Wallet         viem + wagmi v3 — server-side signing only, never client
Smart contract Solidity 0.8.24 · Foundry-compatible · viem-deployed via solc
Hosting        Vercel (web) · Supabase (Postgres + storage)
```

---

## Quickstart

Prerequisites: **Node 20+**, **pnpm 9+**, a **Supabase project** for Postgres,
and (optional but recommended) an **Anthropic API key** for Cowork.

```bash
# 1. Clone + install
git clone https://github.com/Sage-senpai/Elf.git
cd Elf
pnpm install

# 2. Copy env template + fill in what you have
cp .env.example .env.local
# At minimum: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL

# 3. Apply the schema to your Supabase Postgres
pnpm db:generate
node scripts/apply-migration.mjs drizzle/0000_*.sql
# (We use the apply-migration script instead of `pnpm db:push` because
#  drizzle-kit's introspection hangs against the Supabase pooler.)

# 4. Run the dev server
pnpm dev
# http://localhost:3000
```

The landing page renders with no env vars set. API routes that touch the
database, partner SDKs, or wallets throw clear errors until configured.

### Generating the secrets

```bash
# 32-byte hex for BETTER_AUTH_SECRET and ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 32-byte private key for ZG_PRIVATE_KEY / DEPLOYER_PRIVATE_KEY
node -e "console.log('0x' + require('crypto').randomBytes(32).toString('hex'))"
```

---

## Smart contracts

A Foundry project lives in [`contracts/`](contracts/). The single contract
([`ShelfAgentStateManager.sol`](contracts/src/ShelfAgentStateManager.sol))
records autonomous-agent runs on 0G Chain.

Deploy via the bundled TypeScript script (no Foundry install required):

```bash
# Fund a wallet with testnet ZG from https://faucet.0g.ai
# Then set ZG_PRIVATE_KEY in .env.local — same wallet pays for the deploy.

pnpm deploy:contract
```

The script compiles with `solc 0.8.x` inline, deploys via viem, writes the
new address back into `.env.local` as `SHELF_AGENT_CONTRACT_ADDRESS`, and
saves a deployment record (address + tx hash + ABI) to
`contracts/deployments/0g-galileo-testnet.json`.

Foundry tests are also included if you'd rather use that toolchain:

```bash
cd contracts
forge install foundry-rs/forge-std --no-commit
forge test -vv
```

---

## Architecture

```
Browser ─── Next.js (App Router) ─── Hono (api/*)
                                       │
                                       ├─── Drizzle ─── Supabase Postgres
                                       │                ├── users, sessions, accounts (Better Auth)
                                       │                ├── workspaces, projects, commits, attachments
                                       │                ├── fork_requests, cowork_sessions
                                       │                ├── activity, notifications, invites
                                       │                ├── project_treasuries, contributor_payments
                                       │                ├── treasury_transactions
                                       │                ├── zg_audit_log, shelf_agent_state
                                       │                └── mcp_api_keys, axl_sessions
                                       │
                                       ├── Provider interfaces (sacred — no SDK leaks past these)
                                       │     ├── StorageProvider     → Supabase | 0G Storage Log
                                       │     ├── ExecutionProvider   → KeeperHub | immediate-mock
                                       │     ├── MessagingProvider   → AXL binary | Windows mock
                                       │     ├── PaymentProvider     → Uniswap | x402
                                       │     └── InferenceProvider   → Anthropic | 0G Compute
                                       │
                                       ├── Shelf Agent ── records every run via viem ──┐
                                       │                                               ▼
                                       │                                ShelfAgentStateManager
                                       │                                (0G Galileo, id 16602)
                                       └── Better Auth ── GitHub OAuth + magic link
```

### Provider rule

Per spec: **route handlers never call `@0glabs/...`, `@uniswap/...`,
`x402-fetch`, KeeperHub REST, or AXL bindings directly**. Always go through
[`src/lib/providers/`](src/lib/providers/). The interfaces are stable; the
implementations swap out.

---

## Project layout

```
src/
  app/                          Next.js App Router
    api/[[...route]]/           single Hono entrypoint — all server routes
    workspaces/[codename]/      workspace home, projects, audit, agent, forks
    workspaces/new/             create-workspace flow
    sign-in/                    Better Auth UI
    dashboard/                  user's workspaces
    layout.tsx, page.tsx        shell + landing
  components/
    landing/                    hero · problem · how-it-works · stack · use cases · pricing · faq · waitlist · footer
    brand/                      Logo, wordmark
    auth/                       UserMenu, HeaderActions
    notifications/              NotificationBell + drawer
    projects/                   ProjectGrid
    commits/                    CommitList, CommitForm
    forks/                      RequestForkButton, ReviewForkButtons
    cowork/                     chat panel + launcher
    github/                     repo picker dialog
    activity/                   workspace activity feed
    ui/                         Button + small primitives
  db/
    schema/                     21 Drizzle tables (Better Auth + workspace + on-chain)
    repositories/               typed query layer — never raw db.select in routes
    client.ts                   postgres-js + drizzle bootstrap
  lib/
    providers/                  Storage, Execution, Messaging, Payment, Inference
    audit/                      writeAuditEntry → 0G Storage Log + local index
    agent/                      Shelf Agent + on-chain ShelfAgentStateManager helper
    treasury/                   TreasuryService — viem signing for USDC payouts
    forks/                      execution flow
    cowork/                     Anthropic streaming + tool-call loop
    github/                     REST client + commit sync
    auth/                       Better Auth instance + session helpers
    crypto.ts                   AES-256-GCM for stored treasury keys
    codename.ts                 swift-elf-041 generator
  server/
    app.ts                      Hono app
    middleware/                 requireUser, requireWorkspace, requireProject
    routes/                     per-feature routers

contracts/
  src/ShelfAgentStateManager.sol
  script/Deploy.s.sol            (Foundry alternative to scripts/deploy-contract.mjs)
  test/ShelfAgentStateManager.t.sol  (7 unit tests)
  deployments/                   per-network record of deployed addresses + ABIs

scripts/
  deploy-contract.mjs            pnpm deploy:contract — solc + viem
  apply-migration.mjs            workaround when drizzle-kit push hangs
  push-next.sh                   commit-by-commit deploy regulator
```

---

## Available scripts

```
pnpm dev                Run Next.js in dev mode (localhost:3000)
pnpm build              Production build
pnpm start              Run the production build
pnpm lint               Next/ESLint
pnpm typecheck          tsc --noEmit

pnpm db:generate        Generate SQL migrations from schema/
pnpm db:push            (Hangs against Supabase pooler — use apply-migration.mjs)
pnpm db:migrate         Apply migrations via drizzle-kit
pnpm db:studio          Drizzle Studio explorer

pnpm deploy:contract    Compile + deploy ShelfAgentStateManager to 0G testnet
```

---

## Built for ETHGlobal OpenAgents 2026

Elf is real product work — the hackathon is the forcing function to
decentralise infrastructure that was always going to be built. Submission
checklist mapping:

- **0G Network** — `ShelfAgentStateManager` deployed to Galileo testnet,
  Storage Log writes from every audit entry, Compute provider wired for the
  Shelf Agent's inference. Contract: [`0x220b...0c2a`](https://chainscan-galileo.0g.ai/address/0x220bfc37cf1ce6707b98a5e905375c1dbc4b0c2a)
- **Gensyn AXL** — `MessagingProvider` interface + Windows-mock + Linux-binary
  paths. Multi-party Cowork session structure ready (one user node + one
  Claude agent node per session in `axl_sessions` table).
- **KeeperHub** — `ExecutionProvider` interface + immediate-mock. Fork
  approval routes already use it; swap to `KeeperHubProvider` when sponsor
  publishes the REST endpoint.
- **Uniswap** — `PaymentProvider` + Trading API integration plan in
  `TreasuryService`. Direct USDC settlement working today; swap path
  stubbed (see [FEEDBACK.md](FEEDBACK.md)).

---

## Contributing

Day-to-day:

```bash
pnpm typecheck                       # before every commit
./scripts/push-next.sh --status     # what's local vs pushed
./scripts/push-next.sh -n 1         # push the next single commit
```

The repo's commits are intentionally fine-grained to read as a build journey,
not a single mega-commit. The `push-next` script lets you regulate the cadence
when pushing to GitHub — one logical change at a time.

---

## License

UNLICENSED — proprietary work-in-progress. Reach out at
`hello@elf.so` for partnership / contribution conversations.
