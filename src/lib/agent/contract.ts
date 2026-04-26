import "server-only";

import { createPublicClient, createWalletClient, http, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

/**
 * Thin viem wrapper around ShelfAgentStateManager. Compatible with the
 * Foundry-deployed ABI. The contract address comes from
 * SHELF_AGENT_CONTRACT_ADDRESS; agent wallet from AGENT_WALLET_PRIVATE_KEY.
 *
 * recordAgentRun() is no-op + warn when either env is missing — matches
 * the spec's Web2-fallback rule (the agent still does its job, the chain
 * anchor is the only thing skipped).
 */

const ABI = [
  {
    type: "function",
    name: "registerAgent",
    inputs: [{ name: "workspaceId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "recordRun",
    inputs: [
      { name: "workspaceId", type: "bytes32" },
      { name: "actionHash", type: "bytes32" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isRegistered",
    inputs: [{ name: "workspaceId", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view"
  }
] as const;

const zgTestnet = defineChain({
  id: 16601,
  name: "0G Testnet",
  nativeCurrency: { name: "ZG", symbol: "ZG", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] }
  }
});

function workspaceIdHash(uuid: string): `0x${string}` {
  return keccak256(toBytes(uuid));
}

function actionHash(payload: unknown): `0x${string}` {
  return keccak256(toBytes(JSON.stringify(payload)));
}

type AgentChainEnv = {
  contract: `0x${string}`;
  privateKey: `0x${string}`;
  rpc: string;
};

function readEnv(): AgentChainEnv | null {
  const contract = process.env.SHELF_AGENT_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY as `0x${string}` | undefined;
  const rpc = process.env.ZG_EVM_RPC ?? zgTestnet.rpcUrls.default.http[0];
  if (!contract || !privateKey) return null;
  return { contract, privateKey, rpc };
}

/**
 * Idempotent: registers the agent wallet for this workspace if it isn't
 * already. Safe to call before every run — costs ~0 gas after the first.
 */
export async function ensureAgentRegistered(workspaceId: string): Promise<void> {
  const env = readEnv();
  if (!env) return;

  const wsId = workspaceIdHash(workspaceId);
  const transport = http(env.rpc);
  const publicClient = createPublicClient({ chain: zgTestnet, transport });

  const already = (await publicClient.readContract({
    address: env.contract,
    abi: ABI,
    functionName: "isRegistered",
    args: [wsId]
  })) as boolean;
  if (already) return;

  const account = privateKeyToAccount(env.privateKey);
  const wallet = createWalletClient({ account, chain: zgTestnet, transport });
  const txHash = await wallet.writeContract({
    address: env.contract,
    abi: ABI,
    functionName: "registerAgent",
    args: [wsId]
  });
  // eslint-disable-next-line no-console
  console.log("[agent] registered on-chain, tx:", txHash);
}

/**
 * Records an agent run on-chain. Returns the tx hash on success, or null
 * when the env is missing (Web2 fallback path) or the call reverts.
 */
export async function recordAgentRun(opts: {
  workspaceId: string;
  payload: unknown;
}): Promise<{ txHash: `0x${string}`; actionHash: `0x${string}` } | null> {
  const env = readEnv();
  if (!env) return null;

  try {
    await ensureAgentRegistered(opts.workspaceId);
    const wsId = workspaceIdHash(opts.workspaceId);
    const action = actionHash(opts.payload);
    const account = privateKeyToAccount(env.privateKey);
    const wallet = createWalletClient({
      account,
      chain: zgTestnet,
      transport: http(env.rpc)
    });
    const txHash = await wallet.writeContract({
      address: env.contract,
      abi: ABI,
      functionName: "recordRun",
      args: [wsId, action]
    });
    return { txHash, actionHash: action };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[agent] recordAgentRun failed (continuing without anchor):", err);
    return null;
  }
}
