"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json.error === "already_member"
            ? "You're already a member of this workspace."
            : json.error === "wrong_user"
              ? "This invite is for a different email."
              : json.error === "not_found"
                ? "This invite is no longer valid."
                : "Couldn't accept the invite."
        );
        setBusy(false);
        return;
      }
      router.push(`/workspaces/${json.workspaceCodename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="h-11 px-5 rounded-button bg-elf-deep text-elf-on-brand text-sm hover:bg-elf-forest disabled:opacity-50"
      >
        {busy ? "Joining…" : "Accept invite"}
      </button>
      {error && (
        <p className="text-xs text-red-700 border-hair rounded-input p-2.5 bg-red-50">
          {error}
        </p>
      )}
    </div>
  );
}
