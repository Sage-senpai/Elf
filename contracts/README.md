# elf — on-chain contracts

Solidity contracts deployed to **0G Chain** (chain id 16602, Galileo testnet) as
part of the Elf platform.

## What's here

- [`src/ShelfAgentStateManager.sol`](src/ShelfAgentStateManager.sol) —
  per-workspace registration + run log for the autonomous Shelf Agent.
  Each agent registers its wallet once, then writes a 32-byte action
  hash + timestamp every time it runs. Forms the trust-minimised
  record of "did the agent actually run when it was supposed to?"

## Setup

Foundry is required. One-line install (Linux / macOS / WSL2):

```bash
curl -L https://foundry.paradigm.xyz | bash && foundryup
```

Then from this directory:

```bash
forge install foundry-rs/forge-std --no-commit
forge build
forge test -vv
```

## Deploy to 0G testnet

You'll need a wallet with testnet ZG. Faucet: <https://faucet.0g.ai>.

```bash
export ZG_EVM_RPC=https://evmrpc-testnet.0g.ai
export DEPLOYER_PRIVATE_KEY=0x...   # never commit, never share

forge script script/Deploy.s.sol \
  --rpc-url $ZG_EVM_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast
```

The script prints the deployed address. Add it to the project root's
`.env.local`:

```
SHELF_AGENT_CONTRACT_ADDRESS=0x...
```

The Shelf Agent service (in `../src/lib/agent/shelf-agent.ts`) reads
that env var and writes a `recordRun()` tx after every workspace scan.
When the env var is unset the agent still runs and writes Postgres +
0G Storage Log entries — the on-chain anchor is the only thing that
gets skipped.

## Testing

```bash
forge test                 # all tests
forge test -vvv            # with traces
forge coverage             # coverage report
```

## Conventions

- Solidity 0.8.24, optimizer on with 200 runs (matches the deploy
  config's typical balance of contract size vs runtime gas).
- Custom errors (not require strings) for cheaper reverts.
- Events on every state-changing call so off-chain indexers can stream.
- No upgradability for v1 — if the schema needs to change we deploy a
  v2 contract and migrate the off-chain pointer in one step.
