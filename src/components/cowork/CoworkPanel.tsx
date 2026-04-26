"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Pending = currently streaming; not yet persisted. */
  pending?: boolean;
};

type Props = {
  codename: string;
  slug: string;
  open: boolean;
  onClose: () => void;
};

type ToolStatus = { name: string; state: "running" | "done" } | null;

export function CoworkPanel({ codename, slug, open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolStatus, setToolStatus] = useState<ToolStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);

  // Load message history once when the panel opens.
  useEffect(() => {
    if (!open || initialised.current) return;
    initialised.current = true;
    void (async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${codename}/projects/${slug}/cowork/messages`
        );
        const json = (await res.json()) as { messages: Message[] };
        if (Array.isArray(json.messages)) setMessages(json.messages);
      } catch {
        /* leave empty */
      }
    })();
  }, [open, codename, slug]);

  // Auto-scroll on new tokens.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, toolStatus]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const userMsg: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed
    };
    const assistantMsg: Message = {
      id: `local-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      pending: true
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/cowork/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: trimmed })
        }
      );
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        setError(text || `Cowork request failed (${res.status}).`);
        setMessages((prev) => prev.filter((m) => !m.pending));
        return;
      }

      // Parse SSE stream — Anthropic's streamGenerate yields named events
      // we forward as `event: <name>\ndata: {...}\n\n`.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = parseSseFrames(buffer);
        buffer = events.remainder;

        for (const evt of events.frames) {
          handleEvent(evt);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stream error.");
    } finally {
      setStreaming(false);
      setToolStatus(null);
      setMessages((prev) =>
        prev.map((m) => (m.pending ? { ...m, pending: false } : m))
      );
    }
  }

  function handleEvent(evt: { name: string; data: string }) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(evt.data);
    } catch {
      return;
    }
    const type = String(parsed.type ?? evt.name);

    if (type === "text" && typeof parsed.delta === "string") {
      const delta = parsed.delta;
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].pending) {
            next[i] = { ...next[i], content: next[i].content + delta };
            break;
          }
        }
        return next;
      });
      return;
    }
    if (type === "tool_use" && typeof parsed.name === "string") {
      setToolStatus({ name: parsed.name, state: "running" });
      return;
    }
    if (type === "tool_result" && typeof parsed.name === "string") {
      setToolStatus({ name: parsed.name, state: "done" });
      return;
    }
    if (type === "error" && typeof parsed.message === "string") {
      setError(parsed.message);
      return;
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 bg-elf-forest/30 transition-opacity z-40",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed top-0 right-0 bottom-0 w-full max-w-md z-50 flex flex-col bg-elf-warm-white border-l border-hair transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-label="Cowork chat"
      >
        <header className="px-5 py-4 border-b border-hair flex items-center justify-between">
          <div>
            <p className="mono text-[11px] uppercase tracking-widest text-elf-mid">
              cowork
            </p>
            <h2 className="text-base text-elf-forest leading-tight">
              {slug}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-elf-muted hover:text-elf-deep p-1"
            aria-label="Close cowork"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !streaming && (
            <EmptyChat />
          )}
          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}
          {toolStatus && (
            <p className="mono text-[11px] uppercase tracking-widest text-elf-mid">
              {toolStatus.state === "running"
                ? `looking up · ${toolStatus.name}…`
                : `loaded · ${toolStatus.name}`}
            </p>
          )}
          {error && (
            <p className="text-xs text-red-700 border-hair rounded-input p-2.5 bg-red-50">
              {error}
            </p>
          )}
        </div>

        <form onSubmit={send} className="border-t border-hair p-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this project…"
            rows={1}
            disabled={streaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(e as unknown as React.FormEvent);
              }
            }}
            className="flex-1 px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep resize-none"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="shrink-0 inline-flex items-center justify-center h-10 px-4 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest disabled:opacity-50"
          >
            {streaming ? "…" : "Send"}
          </button>
        </form>
      </aside>
    </>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line",
          isUser
            ? "bg-elf-deep text-elf-warm-white"
            : "bg-elf-warm-white border-hair text-elf-ink"
        )}
      >
        {message.content || (message.pending ? "…" : "")}
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="text-sm text-elf-muted leading-relaxed py-6">
      <p className="mb-3">
        Ask anything about this project. Cowork checks live workspace data
        before answering — never invents commits, contributors, or status.
      </p>
      <ul className="text-xs text-elf-muted space-y-1.5 mono">
        <li>· what changed in the last week?</li>
        <li>· who's been most active here?</li>
        <li>· what's the current status and stack?</li>
        <li>· what's in the audit log for this project?</li>
      </ul>
      <p className="mt-4 text-[11px] mono uppercase tracking-widest text-elf-muted/70">
        powered by Claude · needs ANTHROPIC_API_KEY
      </p>
    </div>
  );
}

/** Parses one or more SSE frames out of a buffer, returning leftover bytes. */
function parseSseFrames(buffer: string): {
  frames: Array<{ name: string; data: string }>;
  remainder: string;
} {
  const frames: Array<{ name: string; data: string }> = [];
  let rest = buffer;
  while (true) {
    const idx = rest.indexOf("\n\n");
    if (idx === -1) break;
    const raw = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    let name = "message";
    const dataLines: string[] = [];
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (dataLines.length > 0) frames.push({ name, data: dataLines.join("\n") });
  }
  return { frames, remainder: rest };
}
