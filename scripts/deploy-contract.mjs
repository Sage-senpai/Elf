// Deploy ShelfAgentStateManager to 0G Chain.
//
// Usage:
//   pnpm deploy:contract
//
// Env (read from .env.local):
//   DEPLOYER_PRIVATE_KEY  preferred. Falls back to ZG_PRIVATE_KEY if unset.
//   ZG_EVM_RPC            optional; defaults to https://evmrpc-testnet.0g.ai
//
// Side effects:
//   - Compiles contracts/src/ShelfAgentStateManager.sol with solc 0.8.x
//   - Sends a deploy tx, waits for receipt
//   - Writes (or replaces) SHELF_AGENT_CONTRACT_ADDRESS=... in .env.local
//   - Saves the ABI + address + tx hash to contracts/deployments/<network>.json

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import solc from "solc";
import { createPublicClient, createWalletClient, http, defineChain, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/* -------------------------------------------------------------------------- */
/*  Env loading                                                               */
/* -------------------------------------------------------------------------- */

function loadDotenvLocal() {
  if (!existsSync(".env.local")) return;
  const text = readFileSync(".env.local", "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = v;
  }
}
loadDotenvLocal();

const privateKey =
  process.env.DEPLOYER_PRIVATE_KEY?.trim() ||
  process.env.ZG_PRIVATE_KEY?.trim();

if (!privateKey) {
  console.error(
    "No deployer key. Set DEPLOYER_PRIVATE_KEY or ZG_PRIVATE_KEY in .env.local."
  );
  process.exit(1);
}
if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
  console.error("Private key must be a 0x-prefixed 32-byte hex string.");
  process.exit(1);
}

const rpcUrl = process.env.ZG_EVM_RPC ?? "https://evmrpc-testnet.0g.ai";

// Hardcoded for 0G Galileo testnet. Update when mainnet ships.
// Chain id is 16602 — the older Newton testnet was 16601 and our docs
// initially had the wrong number.
const chain = defineChain({
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "ZG", symbol: "ZG", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
  blockExplorers: {
    default: { name: "0G Scan", url: "https://chainscan-galileo.0g.ai" }
  }
});

/* -------------------------------------------------------------------------- */
/*  Compile                                                                   */
/* -------------------------------------------------------------------------- */

const contractName = "ShelfAgentStateManager";
const sourcePath = resolve(`contracts/src/${contractName}.sol`);
if (!existsSync(sourcePath)) {
  console.error(`Source not found: ${sourcePath}`);
  process.exit(1);
}

console.log(`compiling ${contractName}.sol with solc ${solc.version()}`);

const input = {
  language: "Solidity",
  sources: {
    [`${contractName}.sol`]: { content: readFileSync(sourcePath, "utf8") }
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "shanghai",
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object"] }
    }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((e) => e.severity === "error");
if (errors.length > 0) {
  for (const e of errors) console.error(e.formattedMessage ?? e.message);
  process.exit(1);
}
const warnings = (output.errors ?? []).filter((e) => e.severity === "warning");
for (const w of warnings) console.warn(w.formattedMessage ?? w.message);

const compiled = output.contracts[`${contractName}.sol`][contractName];
const abi = compiled.abi;
const bytecode = `0x${compiled.evm.bytecode.object}`;
console.log(`✓ compiled — bytecode ${(bytecode.length / 2 - 1).toLocaleString()} bytes`);

/* -------------------------------------------------------------------------- */
/*  Deploy                                                                    */
/* -------------------------------------------------------------------------- */

const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain, transport: http() });
const walletClient = createWalletClient({ account, chain, transport: http() });

console.log(`deployer: ${account.address}`);
console.log(`network:  ${chain.name} (id ${chain.id})`);
console.log(`rpc:      ${rpcUrl}`);

let balance;
try {
  balance = await publicClient.getBalance({ address: account.address });
} catch (err) {
  console.error("Failed to reach RPC. Check ZG_EVM_RPC.");
  console.error(err.message ?? err);
  process.exit(1);
}
console.log(`balance:  ${formatEther(balance)} ZG`);
if (balance === 0n) {
  console.error("");
  console.error("Deployer wallet has zero ZG. Get testnet ZG from https://faucet.0g.ai");
  console.error(`Send to: ${account.address}`);
  process.exit(1);
}

// 0G testnet exposes the legacy `eth_gasPrice` JSON-RPC method but not the
// EIP-1559 fee history endpoints viem auto-detects. Pull a price ourselves
// and pass it explicitly so viem skips the broken auto-detection path.
let gasPrice;
try {
  gasPrice = await publicClient.getGasPrice();
  console.log(`gasPrice: ${gasPrice} wei`);
} catch (err) {
  console.error("Failed to fetch gas price:", err.message ?? err);
  process.exit(1);
}

console.log("");
console.log("sending deploy tx...");
let txHash;
try {
  txHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
    gasPrice
  });
} catch (err) {
  console.error("Deploy tx failed:", err.shortMessage ?? err.message ?? err);
  if (err.cause) console.error("cause:", err.cause.message ?? err.cause);
  process.exit(1);
}
console.log(`tx hash:  ${txHash}`);
console.log("waiting for confirmation...");

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
if (receipt.status !== "success") {
  console.error(`Deploy reverted (status ${receipt.status})`);
  process.exit(1);
}
const address = receipt.contractAddress;
console.log("");
console.log(`✓ deployed`);
console.log(`address:  ${address}`);
console.log(`block:    ${receipt.blockNumber}`);
console.log(`gas used: ${receipt.gasUsed.toLocaleString()}`);
console.log(`explorer: ${chain.blockExplorers.default.url}/address/${address}`);

/* -------------------------------------------------------------------------- */
/*  Persist                                                                   */
/* -------------------------------------------------------------------------- */

// 1. Update .env.local in place
const envPath = resolve(".env.local");
let envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const envLine = `SHELF_AGENT_CONTRACT_ADDRESS=${address}`;
if (/^SHELF_AGENT_CONTRACT_ADDRESS=.*$/m.test(envText)) {
  envText = envText.replace(/^SHELF_AGENT_CONTRACT_ADDRESS=.*$/m, envLine);
} else {
  envText = envText.replace(/\s*$/, "") + "\n" + envLine + "\n";
}
writeFileSync(envPath, envText);
console.log(`✓ wrote SHELF_AGENT_CONTRACT_ADDRESS to .env.local`);

// 2. Save deployment record (gitignored — see contracts/.gitignore)
const deploymentsDir = resolve("contracts/deployments");
mkdirSync(deploymentsDir, { recursive: true });
const deploymentFile = resolve(deploymentsDir, `0g-galileo-testnet.json`);
writeFileSync(
  deploymentFile,
  JSON.stringify(
    {
      contract: contractName,
      address,
      txHash,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      deployer: account.address,
      chainId: chain.id,
      deployedAt: new Date().toISOString(),
      abi
    },
    null,
    2
  )
);
console.log(`✓ wrote deployment record to ${deploymentFile}`);

console.log("");
console.log("done. The Shelf Agent will start anchoring its runs on-chain on the");
console.log("next /agent/run that has AGENT_WALLET_PRIVATE_KEY set.");
