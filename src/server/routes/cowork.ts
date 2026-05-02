import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import { requireProject } from "../middleware/project";
import {
  appendMessage,
  getOrCreateSession,
  listSessionMessages
} from "@/db/repositories/cowork";
import { getInferenceProvider } from "@/lib/providers/inference";
import {
  buildCoworkSystemPrompt,
  buildCoworkTools
} from "@/lib/cowork/tools";

/**
 * Mounted at /api/workspaces/:codename/projects/:slug/cowork
 *
 *   GET  /messages   Replay the per-session message log (for chat reload)
 *   POST /messages   Send a user message; SSE-stream the assistant reply
 *
 * Hallucination-resistant by construction: the system prompt has zero
 * project facts. Claude calls elf_get_project / elf_list_commits / etc.
 * server-side and we forward tool_use indicator events to the UI so the
 * user sees 'Looking up project context…'.
 */

const SendBody = z.object({
  message: z.string().min(1, "Message is required").max(4000)
});

export const coworkRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .use("*", requireProject)
  .get("/messages", async (c) => {
    const session = await getOrCreateSession({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id,
      userId: c.var.userId
    });
    const messages = await listSessionMessages(session.id);
    return c.json({ sessionId: session.id, messages });
  })
  .post("/messages", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const parsed = SendBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }

    const session = await getOrCreateSession({
      workspaceId: c.var.workspace.id,
      projectId: c.var.project.id,
      userId: c.var.userId
    });

    // Persist the user's message immediately so a refresh during the
    // stream still shows it.
    await appendMessage({
      sessionId: session.id,
      role: "user",
      content: parsed.data.message
    });

    // Build the conversation history for the model from persisted log.
    const history = await listSessionMessages(session.id);
    const messages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

    // Prefer Groq (free, fast, OpenAI-compatible) when GROQ_API_KEY is set;
    // fall back to Anthropic only if Groq isn't configured. The Groq
    // provider speaks OpenAI's chat-completions schema directly via fetch,
    // not the old broken Anthropic-SDK-pointed-at-Groq trick.
    const inference = process.env.GROQ_API_KEY
      ? getInferenceProvider("groq")
      : getInferenceProvider("anthropic");
    const tools = buildCoworkTools({
      workspaceId: c.var.workspace.id,
      workspaceCodename: c.var.workspace.codename,
      projectId: c.var.project.id,
      projectSlug: c.var.project.slug
    });
    const system = buildCoworkSystemPrompt({
      role: c.var.workspaceRole,
      workspaceCodename: c.var.workspace.codename,
      projectSlug: c.var.project.slug,
      userName: c.var.userEmail.split("@")[0]
    });

    return streamSSE(c, async (stream) => {
      let assistantText = "";
      try {
        for await (const event of inference.streamGenerate({
          messages,
          system,
          tools,
          maxTokens: 1024
        })) {
          if (event.type === "text") {
            assistantText += event.delta;
          }
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event)
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream_failed";
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ type: "error", message })
        });
      } finally {
        if (assistantText.trim().length > 0) {
          await appendMessage({
            sessionId: session.id,
            role: "assistant",
            content: assistantText
          });
        }
        await stream.close();
      }
    });
  });
