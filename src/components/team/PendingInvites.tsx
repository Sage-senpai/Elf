"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Pending = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  inviterName: string | null;
};

export function PendingInvites({
  workspaceCodename,
  pending,
  origin
}: {
  workspaceCodename: string;
  pending: Pending[];
  origin: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (pending.length === 0) {
    return (
      <p className="text-sm text-elf-muted">No pending invites.</p>
    );
  }

  async function revoke(id: string) {
    setBusy(id);
    try {
      await fetch(`/api/workspaces/${workspaceCodename}/invites/${id}`, {
        method: "DELETE"
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(`${origin}/invite/${token}`);
    } catch {
      /* ignore */
    }
  }

  return (
    <ul className="divide-y divide-hair border-hair rounded-card">
      {pending.map((inv) => (
        <li
          key={inv.id}
          className="px-4 py-3 flex flex-wrap items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-elf-ink truncate">{inv.email}</p>
            <p className="mono text-[10px] uppercase tracking-widest text-elf-muted mt-0.5">
              {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
              {inv.inviterName ? ` · invited by ${inv.inviterName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(inv.token)}
            className="mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-button border-hair text-elf-ink hover:bg-elf-warm-white"
          >
            Copy link
          </button>
          <button
            type="button"
            disabled={busy === inv.id}
            onClick={() => revoke(inv.id)}
            className="mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-button border-hair text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {busy === inv.id ? "…" : "Revoke"}
          </button>
        </li>
      ))}
    </ul>
  );
}
