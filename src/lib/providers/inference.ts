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

class ZeroGComputeInferenceProvider implements InferenceProvider {
  readonly kind = "0g-compute" as const;

  async generate(_req: InferenceRequest): Promise<InferenceResponse> {
    // TODO: import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker'
    //       lands alongside the Shelf Agent itself.
    throw new Error("ZeroGComputeInferenceProvider.generate not yet wired (sprint week 8).");
  }

  async *streamGenerate(_req: InferenceRequest): AsyncIterable<StreamEvent> {
    yield {
      type: "error",
      message: "0G Compute streaming not yet wired."
    };
  }
}

export function getInferenceProvider(
  kind: "anthropic" | "0g-compute" = "anthropic"
): InferenceProvider {
  return kind === "0g-compute"
    ? new ZeroGComputeInferenceProvider()
    : new AnthropicInferenceProvider();
}
