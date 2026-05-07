"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Key = {
  id: string;
  name: string;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
};

export function McpKeysPanel({
  codename,
  initialKeys,
  origin
}: {
  codename: string;
  initialKeys: Key[];
  origin: string;
}) {
  const router = useRouter();
  const [keys, setKeys] = useState<Key[]>(initialKeys);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; plaintext: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setKeys(initialKeys), [initialKeys]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    setRevealed(null);
    try {
      const res = await fetch(`/api/workspaces/${codename}/mcp-keys`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Couldn't create key.");
        return;
      }
      setKeys((prev) => [json.key, ...prev]);
      setRevealed({ id: json.key.id, plaintext: json.plaintext });
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Clients using it will stop working immediately.")) return;
    await fetch(`/api/workspaces/${codename}/mcp-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
    if (revealed?.id === id) setRevealed(null);
    router.refresh();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  const mcpUrl = `${origin}/api/mcp`;

  return (
    <div className="space-y-6">
      <div className="border-hair rounded-card p-5 bg-elf-mint/15">
        <p className="mono text-xs uppercase tracking-widest text-elf-forest mb-2">
          mcp endpoint
        </p>
        <code className="block mono text-[12px] text-elf-ink break-all">
          {mcpUrl}
        </code>
        <p className="text-xs text-elf-muted mt-2 leading-relaxed">
          Add this as an MCP server in Cursor, Claude Desktop, or your own
          client. Authenticate with{" "}
          <span className="mono">Authorization: Bearer &lt;your-key&gt;</span>.
          Two tools today: <span className="mono">elf_list_projects</span> and{" "}
          <span className="mono">elf_list_commits</span>.
        </p>
      </div>

      <form onSubmit={create} className="border-hair rounded-card p-5 space-y-3">
        <p className="mono text-xs uppercase tracking-widest text-elf-mid">
          new key
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What is this key for? — e.g. cursor-laptop"
          maxLength={80}
          className="w-full px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
        />
        {error && (
          <p className="text-xs text-red-700 border-hair rounded-input p-2 bg-red-50">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="h-9 px-4 rounded-button bg-elf-deep text-elf-on-brand text-sm hover:bg-elf-forest disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate key"}
          </button>
        </div>
      </form>

      {revealed && (
        <div className="border-hair rounded-card p-5 bg-amber-50">
          <p className="mono text-xs uppercase tracking-widest text-amber-800 mb-2">
            copy this — you won&apos;t see it again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 mono text-[11px] text-elf-ink break-all bg-elf-warm-white border-hair rounded-input p-2">
              {revealed.plaintext}
            </code>
            <button
              type="button"
              onClick={() => copy(revealed.plaintext)}
              className="shrink-0 mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-button bg-elf-deep text-elf-on-brand hover:bg-elf-forest"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
          active keys
        </p>
        {keys.length === 0 ? (
          <p className="text-sm text-elf-muted border-hair rounded-card p-5">
            No keys yet. Generate one to connect an MCP client.
          </p>
        ) : (
          <ul className="divide-y divide-hair border-hair rounded-card">
            {keys.map((k) => (
              <li
                key={k.id}
                className="px-4 py-3 flex items-center gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-elf-ink truncate">{k.name}</p>
                  <p className="mono text-[10px] uppercase tracking-widest text-elf-muted mt-0.5">
                    created {new Date(k.createdAt).toLocaleDateString()}
                    {k.lastUsedAt
                      ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : " · never used"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(k.id)}
                  className="mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-button text-red-700 hover:bg-red-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
