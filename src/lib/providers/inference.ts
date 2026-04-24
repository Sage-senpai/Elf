/**
 * InferenceProvider — runs LLM inference for Cowork + Shelf Agent.
 *
 * Real impls:
 *  - AnthropicInferenceProvider — Claude API, used by Cowork (synchronous UX)
 *  - ZeroGComputeInferenceProvider — sealed inference on 0G Compute, used by
 *    the Shelf Agent (decentralized + agent pays via x402)
 *
 * Spec rule: Claude must NOT receive the project manifest in the system
 * prompt. Use MCP tool calls to fetch live data (section 10, layer 1).
 */

export type InferenceMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InferenceRequest = {
  messages: InferenceMessage[];
  system?: string;
  maxTokens?: number;
  /** Pass to force a specific model (otherwise uses provider default). */
  model?: string;
};

export type InferenceResponse = {
  content: string;
  /** True for any text the model generated; downstream JSON-mode callers must validate. */
  inputTokens?: number;
  outputTokens?: number;
};

export interface InferenceProvider {
  readonly kind: "anthropic" | "0g-compute";
  generate(req: InferenceRequest): Promise<InferenceResponse>;
}

class AnthropicInferenceProvider implements InferenceProvider {
  readonly kind = "anthropic" as const;
  private readonly defaultModel = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  async generate(req: InferenceRequest): Promise<InferenceResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set.");
    }
    // TODO: import Anthropic from '@anthropic-ai/sdk'
    //       const client = new Anthropic()
    //       const r = await client.messages.create({ model, system, messages, max_tokens })
    throw new Error("AnthropicInferenceProvider.generate not yet wired (sprint week 5).");
  }
}

class ZeroGComputeInferenceProvider implements InferenceProvider {
  readonly kind = "0g-compute" as const;

  async generate(_req: InferenceRequest): Promise<InferenceResponse> {
    // TODO: import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker'
    //       const broker = await createZGComputeNetworkBroker(agentWallet, RPC_URL)
    //       pick service, processRequest -> fetch endpoint -> processResponse
    throw new Error("ZeroGComputeInferenceProvider.generate not yet wired (sprint week 8).");
  }
}

export function getInferenceProvider(
  kind: "anthropic" | "0g-compute" = "anthropic"
): InferenceProvider {
  return kind === "0g-compute"
    ? new ZeroGComputeInferenceProvider()
    : new AnthropicInferenceProvider();
}
