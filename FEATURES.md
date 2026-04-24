# Features — what's free and what's paid

> **Hackathon note (ETHGlobal OpenAgents 2026):** while the hackathon is live,
> **every feature in the table below is unlocked for every user**. We do not
> enforce plan limits during judging because it would block a judge or a
> contributor from seeing the full product. After the hackathon ships, we'll
> add the gating layer (`requirePlan` middleware + UI lockouts) and the
> Stripe checkout — see [Implementation hooks](#implementation-hooks) at the
> bottom.

---

## Plans

| Plan        | Price       | Who it's for                                            |
|-------------|-------------|---------------------------------------------------------|
| Free        | $0          | Solo builders kicking the tires                          |
| Builder     | $19 / mo    | Indie builders + small mixed teams                       |
| Studio      | $49 / mo    | Small agencies, founder + content lead, the Shelf Agent |
| Enterprise  | Talk to us  | Custom orgs, GitHub Enterprise, SSO                      |

All paid plans include everything in the lower tier.

---

## Feature matrix

### Workspace + collaboration

| Feature                                    | Free  | Builder | Studio    | Enterprise |
|--------------------------------------------|-------|---------|-----------|------------|
| Workspaces per user                        | 1     | 3       | 10        | unlimited  |
| Projects per workspace                     | 3     | 10      | unlimited | unlimited  |
| Members per workspace                      | 3     | 10      | unlimited | unlimited  |
| Per-project permission overrides           | ✓     | ✓       | ✓         | ✓          |
| Activity feed                              | ✓     | ✓       | ✓         | ✓          |
| In-app + email notifications               | ✓     | ✓       | ✓         | ✓          |

### Source control

| Feature                                    | Free  | Builder | Studio    | Enterprise |
|--------------------------------------------|-------|---------|-----------|------------|
| GitHub integration                         | ✓     | ✓       | ✓         | ✓          |
| GitLab / Bitbucket integration             | ✗     | ✓       | ✓         | ✓          |
| GitHub Enterprise                          | ✗     | ✗       | ✗         | ✓          |
| Fork request workflow (Web2)               | ✓     | ✓       | ✓         | ✓          |
| KeeperHub guaranteed fork execution        | ✗     | ✓       | ✓         | ✓          |

### Cowork (AI workspace)

| Feature                                    | Free       | Builder       | Studio      | Enterprise |
|--------------------------------------------|------------|---------------|-------------|------------|
| Single-user Cowork (Anthropic)             | 100 req/h  | unlimited     | unlimited   | unlimited  |
| Multi-party Cowork over AXL                | ✗          | ✓ (2 users)   | ✓ (∞ users) | ✓          |
| MCP API keys                               | 1          | 3             | unlimited   | unlimited  |
| Custom MCP tools (workspace-scoped)        | ✗          | ✗             | ✓           | ✓          |

### Storage + audit

| Feature                                    | Free  | Builder | Studio    | Enterprise |
|--------------------------------------------|-------|---------|-----------|------------|
| Supabase storage (default)                 | ✓     | ✓       | ✓         | ✓          |
| 0G Storage opt-in (per workspace)          | ✗     | ✓       | ✓         | ✓          |
| 0G Storage Log audit viewer                | ✗     | ✓       | ✓         | ✓          |
| Verify-on-chain button per audit entry     | ✗     | ✓       | ✓         | ✓          |
| Export audit log to CSV                    | ✗     | ✗       | ✓         | ✓          |

### Treasury + payments

| Feature                                    | Free  | Builder         | Studio       | Enterprise |
|--------------------------------------------|-------|-----------------|--------------|------------|
| Project treasury                           | ✗     | 1 / workspace   | unlimited    | ✓          |
| Contributor payments in USDC               | ✗     | ✓               | ✓            | ✓          |
| Uniswap swap on payment                    | ✗     | ✓               | ✓            | ✓          |
| x402 protocol fee on fork approval         | ✗     | optional        | default on   | custom     |
| Stripe billing for the platform itself     | n/a   | required        | required     | invoiced   |
| x402 Builder/Studio subscription payment   | ✗     | optional        | optional     | optional   |

### The Shelf Agent (autonomous monitor)

| Feature                                    | Free  | Builder | Studio   | Enterprise |
|--------------------------------------------|-------|---------|----------|------------|
| Shelf Agent runs                           | ✗     | ✗       | ✓        | ✓          |
| Shelf Agent on 0G Compute (decentralized)  | ✗     | ✗       | ✓        | ✓          |
| Stale-project notifications                | ✗     | ✗       | ✓        | ✓          |
| Treasury auto-rebalance (Uniswap swap)     | ✗     | ✗       | opt-in   | ✓          |
| Custom agent triggers                      | ✗     | ✗       | ✗        | ✓          |

### Org + governance

| Feature                                    | Free  | Builder | Studio | Enterprise |
|--------------------------------------------|-------|---------|--------|------------|
| SSO (SAML / OIDC)                          | ✗     | ✗       | ✗      | ✓          |
| Audit-log retention beyond 1 year          | ✗     | ✗       | 3 yr   | unlimited  |
| Custom data retention policy               | ✗     | ✗       | ✗      | ✓          |
| SLA + dedicated support channel            | ✗     | ✗       | ✗      | ✓          |

---

## Why this list exists now

Every feature above is implemented during the hackathon **without** plan
checks. After the hackathon, gating will be added in three places:

1. **Backend middleware (`requirePlan`)** — runs before any handler that
   creates a paid resource. Reads `workspace.plan` and either short-circuits
   with 402 or annotates the request context.
2. **UI lockouts** — buttons and routes for paid features render disabled
   with a "Studio plan" badge and an "Upgrade" link for users on a lower tier.
3. **Stripe checkout + webhooks** — `/api/billing/checkout` returns a Stripe
   session URL, the webhook updates `workspaces.plan` and
   `workspaces.stripe_subscription_id`.

When you're ready to add gating, the locations are already wired:

- `workspaces.plan` column already exists in the schema
  ([src/db/schema/workspaces.ts](src/db/schema/workspaces.ts))
- `STRIPE_*` env vars already in [.env.example](.env.example)
- The `Plan` TS type is exported from `src/db/schema/workspaces.ts` for use
  in the future `requirePlan` middleware

---

## Implementation hooks (for the post-hackathon gating PR)

```ts
// src/server/middleware/require-plan.ts  — to add later
export function requirePlan(min: Plan): MiddlewareHandler { /* ... */ }

// usage in a route:
treasury.post('/', requirePlan('builder'), async (c) => { ... })

// usage in a server component:
const ws = await getWorkspace(id)
if (!planAllows(ws.plan, 'shelf-agent')) {
  return <UpgradePrompt to="studio" feature="Shelf Agent" />
}
```

Stripe webhook to wire up later:

```
POST /api/billing/webhook
  → verify signature with STRIPE_WEBHOOK_SECRET
  → on 'checkout.session.completed': set workspaces.plan, stripe_subscription_id
  → on 'customer.subscription.deleted': set workspaces.plan = 'free'
```

That's the entire gating story. Until then — every Elf user gets every Elf
feature.
