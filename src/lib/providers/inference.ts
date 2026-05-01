/**
 * InferenceProvider — runs LLM inference for Cowork + Shelf Agent.
 *
 *  - AnthropicInferenceProvider — Claude API, used by Cowork (synchronous UX).
 *    Implements both blocking generate() and streamGenerate() for the
 *    chat UI's SSE endpoint. Supports tool-use so the hallucination-
 *    resistant pattern works (model fetches live data on demand instead
 *    of receiving a stuffed prompt).
 *  - ZeroGComputeInferenceProvider — sealed inference on 0G Compute, used
 *    by the Shelf Agent (decentralized + agent pays via x402).
 *
 * Spec rule (section 10): Claude must NOT receive the project manifest
 * baked into a system prompt. Use tool calls to fetch live data.
 */

import type Anthropic from "@anthropic-ai/sdk";

export type InferenceMessage = {
  role: "user" | "assistant";
  content: string;
};

export type InferenceTool = {
  name: string;
  description: string;
  // JSON Schema for the tool's input.
  input_schema: Record<string, unknown>;
  // Server-side handler invoked when Claude requests this tool.
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

export type InferenceRequest = {
  messages: InferenceMessage[];
  system?: string;
  maxTokens?: number;
  model?: string;
  tools?: InferenceTool[];
};

export type InferenceResponse = {
  content: string;
  stopReason?: string;
  inputTokens?: number;
  outputTokens?: number;
};

/**
 * Streaming event for SSE. The chat UI listens to these and either appends
 * text deltas, shows tool-use indicators, or finalises the message.
 */
export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_use"; name: string }
  | { type: "tool_result"; name: string }
  | { type: "done"; stopReason?: string }
  | { type: "error"; message: string };

export interface InferenceProvider {
  readonly kind: "anthropic" | "0g-compute";
  generate(req: InferenceRequest): Promise<InferenceResponse>;
  streamGenerate(req: InferenceRequest): AsyncIterable<StreamEvent>;
}

class AnthropicInferenceProvider implements InferenceProvider {
  readonly kind = "anthropic" as const;
  private readonly defaultModel = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

  private async client(): Promise<Anthropic> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable Cowork."
      );
    }
    const { default: AnthropicSDK } = await import("@anthropic-ai/sdk");
    return new AnthropicSDK();
  }

  /**
   * Blocking single-turn generate. Currently used for the audit log helper
   * if the Shelf Agent later needs a quick decision; the chat UI uses
   * streamGenerate() instead for incremental rendering.
   */
  async generate(req: InferenceRequest): Promise<InferenceResponse> {
    const client = await this.client();
    const response = await client.messages.create({
      model: req.model ?? this.defaultModel,
      system: req.system,
      max_tokens: req.maxTokens ?? 1024,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content }))
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return {
      content: text,
      stopReason: response.stop_reason ?? undefined,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
    };
  }

  /**
   * Streaming generate with tool-use loop. Yields StreamEvents the SSE
   * route forwards to the browser.
   *
   * Loop semantics (Anthropic tool-use):
   *  1. Stream text deltas as they arrive.
   *  2. If the model emits a tool_use block at end of turn, invoke the
   *     tool's handler server-side, append the result as a tool_result,
   *     and re-stream the next turn. Repeat until stop_reason is anything
   *     other than 'tool_use'.
   *  3. Bounded to 6 tool calls per request to prevent runaway loops.
   */
  async *streamGenerate(req: InferenceRequest): AsyncIterable<StreamEvent> {
    const client = await this.client();
    const tools = req.tools ?? [];
    const toolDefs = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema
    }));
    const handlerByName = new Map(tools.map((t) => [t.name, t.handler]));

    // Anthropic's "messages" type for the next turn — accumulates as the
    // tool-use loop runs.
    const messages: Anthropic.MessageParam[] = req.messages.map((m) => ({
      role: m.role,
      content: m.content
    }));

    for (let turn = 0; turn < 6; turn++) {
      const stream = client.messages.stream({
        model: req.model ?? this.defaultModel,
        system: req.system,
        max_tokens: req.maxTokens ?? 1024,
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined
      });

      let stopReason: string | null = null;
      const pendingToolUses: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
      }> = [];
      const assistantBlocks: Anthropic.ContentBlockParam[] = [];

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", delta: event.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      stopReason = finalMessage.stop_reason ?? null;

      for (const block of finalMessage.content) {
        if (block.type === "text") {
          assistantBlocks.push({ type: "text", text: block.text });
        }
        if (block.type === "tool_use") {
          assistantBlocks.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>
          });
          pendingToolUses.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>
          });
        }
      }

      // Append the assistant turn so subsequent turns see it.
      messages.push({ role: "assistant", content: assistantBlocks });

      if (stopReason !== "tool_use" || pendingToolUses.length === 0) {
        yield { type: "done", stopReason: stopReason ?? undefined };
        return;
      }

      // Execute every requested tool serially. Yield indicator events so
      // the chat UI can render "Looking up project context…" hints.
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of pendingToolUses) {
        yield { type: "tool_use", name: tu.name };
        const handler = handlerByName.get(tu.name);
        if (!handler) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            is_error: true,
            content: `Unknown tool: ${tu.name}`
          });
          continue;
        }
        try {
          const result = await handler(tu.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: typeof result === "string" ? result : JSON.stringify(result)
          });
          yield { type: "tool_result", name: tu.name };
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            is_error: true,
            content: err instanceof Error ? err.message : "Tool failed"
          });
        }
      }
      // Append the user-role tool_result turn for the next iteration.
      messages.push({ role: "user", content: toolResults });
    }

    yield { type: "error", message: "Tool-use loop exceeded 6 turns." };
  }
}

/**
 * Groq inference — free API with no rate limits, supports tool-use.
 * Uses Groq's OpenAI-compatible endpoint for instant responses.
 *
 * Models available:
 *  - mixtral-8x7b-32768 (best quality, 32k context)
 *  - llama-2-70b-chat (very capable)
 *  - gemma-7b-it (fast)
 */
class GroqInferenceProvider implements InferenceProvider {
  readonly kind = "anthropic" as const;
  private readonly defaultModel = "mixtral-8x7b-32768";

  private async client(): Promise<Anthropic> {
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        "GROQ_API_KEY is not set. Get one free at https://console.groq.com/keys"
      );
    }
    // Reuse Anthropic SDK for compatibility (Groq endpoint is compatible)
    const { default: AnthropicSDK } = await import("@anthropic-ai/sdk");
    return new AnthropicSDK({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    }) as Anthropic;
  }

  async generate(req: InferenceRequest): Promise<InferenceResponse> {
    const client = await this.client();
    const response = await client.messages.create({
      model: req.model ?? this.defaultModel,
      system: req.system,
      max_tokens: req.maxTokens ?? 1024,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content }))
    });
    const text = response.content
      .filter((b): b is import("@anthropic-ai/sdk").default.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return {
      content: text,
      stopReason: response.stop_reason ?? undefined,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens
    };
  }

  async *streamGenerate(req: InferenceRequest): AsyncIterable<StreamEvent> {
    const client = await this.client();
    const tools = req.tools ?? [];
    const toolDefs = tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as import("@anthropic-ai/sdk").default.Tool.InputSchema
    }));
    const handlerByName = new Map(tools.map((t) => [t.name, t.handler]));

    const messages: import("@anthropic-ai/sdk").default.MessageParam[] = req.messages.map((m) => ({
      role: m.role,
      content: m.content
    }));

    for (let turn = 0; turn < 6; turn++) {
      const stream = client.messages.stream({
        model: req.model ?? this.defaultModel,
        system: req.system,
        max_tokens: req.maxTokens ?? 1024,
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined
      });

      let stopReason: string | null = null;
      const pendingToolUses: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
      }> = [];
      const assistantBlocks: import("@anthropic-ai/sdk").default.ContentBlockParam[] = [];

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { type: "text", delta: event.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      stopReason = finalMessage.stop_reason ?? null;

      for (const block of finalMessage.content) {
        if (block.type === "text") {
          assistantBlocks.push({ type: "text", text: block.text });
        }
        if (block.type === "tool_use") {
          assistantBlocks.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>
          });
          pendingToolUses.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>
          });
        }
      }

      messages.push({ role: "assistant", content: assistantBlocks });

      if (stopReason !== "tool_use" || pendingToolUses.length === 0) {
        yield { type: "done", stopReason: stopReason ?? undefined };
        return;
      }

      const toolResults: import("@anthropic-ai/sdk").default.ToolResultBlockParam[] = [];
      for (const tu of pendingToolUses) {
        yield { type: "tool_use", name: tu.name };
        const handler = handlerByName.get(tu.name);
        if (!handler) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            is_error: true,
            content: `Unknown tool: ${tu.name}`
          });
          continue;
        }
        try {
          const result = await handler(tu.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: typeof result === "string" ? result : JSON.stringify(result)
          });
          yield { type: "tool_result", name: tu.name };
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            is_error: true,
            content: err instanceof Error ? err.message : "Tool failed"
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }

    yield { type: "error", message: "Tool-use loop exceeded 6 turns." };
  }
}

/**
 * Sealed inference on the 0G Compute Network. Used by the Shelf Agent so
 * its reasoning runs on a decentralised provider, not on Anthropic. Pays
 * out of the agent wallet's on-chain ZG balance via per-provider
 * sub-accounts. Settlement is JWT-against-contract, not HTTP-402-per-
 * request — we sign once per call and the provider claims usage later.
 *
 * Initialises the broker lazily on first call and reuses it for the
 * lifetime of the process; getRequestHeaders is the slowest call in the
 * loop (~100-300ms JWT sign), so we never want to re-init.
 */
class ZeroGComputeInferenceProvider implements InferenceProvider {
  readonly kind = "0g-compute" as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private brokerPromise: Promise<any> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getBroker(): Promise<any> {
    if (this.brokerPromise) return this.brokerPromise;
    this.brokerPromise = (async () => {
      if (!process.env.AGENT_WALLET_PRIVATE_KEY) {
        throw new Error(
          "AGENT_WALLET_PRIVATE_KEY not set — agent has no wallet to pay 0G Compute."
        );
      }
      const rpc = process.env.ZG_EVM_RPC ?? "https://evmrpc-testnet.0g.ai";
      const { ethers } = await import("ethers");
      const { createZGComputeNetworkBroker } = await import("@0glabs/0g-serving-broker");
      const provider = new ethers.JsonRpcProvider(rpc);
      const wallet = new ethers.Wallet(
        process.env.AGENT_WALLET_PRIVATE_KEY,
        provider
      );
      // Factory derives ledger + inference contract addresses from the
      // chain id — no need to pass them on testnet (16602).
      return createZGComputeNetworkBroker(wallet);
    })();
    return this.brokerPromise;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async pickService(
    broker: { inference: { listService: () => Promise<unknown[]>; acknowledgeProviderSigner: (a: string) => Promise<unknown>; getServiceMetadata: (a: string) => Promise<{ endpoint: string; model: string }> } },
    preferredModel?: string
  ): Promise<{ providerAddr: string; endpoint: string; model: string }> {
    const services = (await broker.inference.listService()) as Array<{
      provider: string;
      model: string;
      inputPrice: bigint;
      outputPrice: bigint;
    }>;
    const candidates = preferredModel
      ? services.filter((s) => s.model === preferredModel)
      : services;
    if (candidates.length === 0) {
      throw new Error(
        preferredModel
          ? `No 0G Compute provider serves model "${preferredModel}".`
          : "No 0G Compute providers available right now."
      );
    }
    candidates.sort((a, b) =>
      Number(a.inputPrice + a.outputPrice - (b.inputPrice + b.outputPrice))
    );
    const svc = candidates[0];

    // Acknowledge once per provider — throws "already acknowledged" on
    // every subsequent call, which is fine.
    try {
      await broker.inference.acknowledgeProviderSigner(svc.provider);
    } catch {
      /* already acknowledged */
    }

    const meta = await broker.inference.getServiceMetadata(svc.provider);
    return { providerAddr: svc.provider, endpoint: meta.endpoint, model: meta.model };
  }

  async generate(req: InferenceRequest): Promise<InferenceResponse> {
    const broker = await this.getBroker();
    const { providerAddr, endpoint, model } = await this.pickService(
      broker,
      req.model
    );

    const messages = req.system
      ? [{ role: "system" as const, content: req.system }, ...req.messages]
      : req.messages;
    const promptForAuth = messages.map((m) => m.content).join("\n");
    const headers = await broker.inference.getRequestHeaders(
      providerAddr,
      promptForAuth
    );

    const res = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: req.maxTokens ?? 512
      })
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`0G Compute HTTP ${res.status}: ${text.slice(0, 200)}`);
    }
    const chatID = res.headers.get("ZG-Res-Key") ?? undefined;
    const json = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: Record<string, number>;
    };

    // Settle usage on-chain. Errors here don't fail the call — we
    // already have the response.
    try {
      await broker.inference.processResponse(
        providerAddr,
        chatID,
        JSON.stringify(json.usage ?? {})
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[0g-compute] processResponse failed:", err);
    }

    return {
      content: json.choices?.[0]?.message?.content ?? "",
      stopReason: json.choices?.[0]?.finish_reason ?? undefined,
      inputTokens: json.usage?.prompt_tokens,
      outputTokens: json.usage?.completion_tokens
    };
  }

  /**
   * Streaming via the OpenAI-compatible endpoint. Tool-use is NOT plumbed
   * through here — Cowork uses Anthropic for that. The Shelf Agent uses
   * generate() (single-turn), so this path is mainly for parity.
   */
  async *streamGenerate(req: InferenceRequest): AsyncIterable<StreamEvent> {
    try {
      const result = await this.generate(req);
      if (result.content) yield { type: "text", delta: result.content };
      yield { type: "done", stopReason: result.stopReason };
    } catch (err) {
      yield {
        type: "error",
        message: err instanceof Error ? err.message : "0G Compute failed."
      };
    }
  }
}

/**
 * Picks an inference provider based on env. The Shelf Agent calls this
 * with explicit kind='0g-compute' when the user has opted in via
 * SHELF_AGENT_USE_0G_COMPUTE=true; otherwise falls back to Anthropic so
 * the agent always has a way to think.
 */
export function pickAgentInferenceProvider(): InferenceProvider {
  const wantsZg =
    (process.env.SHELF_AGENT_USE_0G_COMPUTE ?? "").toLowerCase() === "true" &&
    !!process.env.AGENT_WALLET_PRIVATE_KEY;
  return getInferenceProvider(wantsZg ? "0g-compute" : "anthropic");
}

export function getInferenceProvider(
  kind: "anthropic" | "groq" | "0g-compute" = "anthropic"
): InferenceProvider {
  if (kind === "0g-compute") return new ZeroGComputeInferenceProvider();
  if (kind === "groq") return new GroqInferenceProvider();
  return new AnthropicInferenceProvider();
}
