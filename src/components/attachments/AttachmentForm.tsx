"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AttachmentType = "link" | "doc" | "deck" | "figma" | "notion" | "pdf" | "other";

const TYPES: { value: AttachmentType; label: string; placeholder: string }[] = [
  { value: "link", label: "Link", placeholder: "Reference URL" },
  { value: "doc", label: "Doc", placeholder: "Google Doc URL" },
  { value: "deck", label: "Deck", placeholder: "Slides URL" },
  { value: "figma", label: "Figma", placeholder: "Figma file URL" },
  { value: "notion", label: "Notion", placeholder: "Notion page URL" },
  { value: "pdf", label: "PDF", placeholder: "PDF URL" },
  { value: "other", label: "Other", placeholder: "URL (optional)" }
];

export function AttachmentForm({
  codename,
  slug
}: {
  codename: string;
  slug: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<AttachmentType>("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/attachments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type,
            title: title.trim(),
            url: url.trim() || undefined
          })
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message || json.error || "Couldn't add reference.");
        return;
      }
      setTitle("");
      setUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  }

  const meta = TYPES.find((t) => t.value === type)!;

  return (
    <form onSubmit={submit} className="border-hair rounded-card p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            aria-pressed={type === t.value}
            className={
              "mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-badge transition-colors " +
              (type === t.value
                ? "bg-elf-deep text-elf-on-brand"
                : "bg-elf-border/40 text-elf-muted hover:bg-elf-border/60")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — what is this?"
        maxLength={120}
        className="w-full px-3 py-2 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={meta.placeholder}
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
          disabled={busy || !title.trim()}
          className="h-9 px-4 rounded-button bg-elf-deep text-elf-on-brand text-sm hover:bg-elf-forest disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add reference"}
        </button>
      </div>
    </form>
  );
}
