"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Attachment } from "@/db/schema/projects";
import { cn } from "@/lib/cn";

const TYPE_LABEL: Record<string, string> = {
  link: "Link",
  doc: "Doc",
  deck: "Deck",
  figma: "Figma",
  notion: "Notion",
  pdf: "PDF",
  other: "Reference"
};

const TYPE_TONE: Record<string, string> = {
  link: "bg-elf-border/40 text-elf-muted",
  doc: "bg-elf-mint text-elf-forest",
  deck: "bg-elf-deep/15 text-elf-deep",
  figma: "bg-pink-100 text-pink-700",
  notion: "bg-elf-border/40 text-elf-muted",
  pdf: "bg-amber-100 text-amber-800",
  other: "bg-elf-border/40 text-elf-muted"
};

export function AttachmentList({
  codename,
  slug,
  attachments,
  authorById,
  canEdit
}: {
  codename: string;
  slug: string;
  attachments: Attachment[];
  authorById: Record<string, { name: string }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (attachments.length === 0) {
    return (
      <div className="border-hair rounded-card p-6">
        <p className="text-sm text-elf-muted leading-relaxed">
          No references yet. Anyone on the team — writers, designers, PMs —
          can drop links to briefs, decks, Figma boards, the original idea
          doc. Whatever the project needs to remember.
        </p>
      </div>
    );
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await fetch(
        `/api/workspaces/${codename}/projects/${slug}/attachments/${id}`,
        { method: "DELETE" }
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="divide-y divide-hair border-hair rounded-card overflow-hidden">
      {attachments.map((a) => (
        <li
          key={a.id}
          className="px-4 py-3 flex items-center gap-3 flex-wrap"
        >
          <span
            className={cn(
              "mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-badge shrink-0",
              TYPE_TONE[a.type] ?? TYPE_TONE.other
            )}
          >
            {TYPE_LABEL[a.type] ?? a.type}
          </span>
          <div className="flex-1 min-w-0">
            {a.url ? (
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-elf-deep hover:text-elf-forest underline underline-offset-2 break-all"
              >
                {a.title}
              </a>
            ) : (
              <span className="text-sm text-elf-ink">{a.title}</span>
            )}
            <p className="mono text-[10px] text-elf-muted mt-0.5">
              {authorById[a.addedBy]?.name ?? "—"} ·{" "}
              {new Date(a.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric"
              })}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              disabled={busy === a.id}
              onClick={() => remove(a.id)}
              className="mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-button text-elf-muted hover:text-red-700 disabled:opacity-50"
            >
              {busy === a.id ? "…" : "Remove"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
