"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Repo = {
  id: number;
  full_name: string;
  description: string | null;
  private: boolean;
  pushed_at: string | null;
  language: string | null;
};

type Props = {
  codename: string;
  slug: string;
  initialRepo: string | null;
  canEdit: boolean;
};

export function GithubLinkCard({ codename, slug, initialRepo, canEdit }: Props) {
  const [linked, setLinked] = useState<string | null>(initialRepo);
  const [pickerOpen, setPickerOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="border-hair rounded-card p-5">
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
        GitHub
      </p>

      {linked ? (
        <div>
          <a
            href={`https://github.com/${linked}`}
            target="_blank"
            rel="noreferrer"
            className="mono text-sm text-elf-deep underline underline-offset-2 break-all"
          >
            {linked}
          </a>
          <p className="mono text-[10px] uppercase tracking-widest text-elf-muted mt-2">
            auto-syncs every 30 min
          </p>
          {canEdit && (
            <div className="mt-4 space-y-3">
              <SyncButton codename={codename} slug={slug} onSynced={() => router.refresh()} />
              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="text-xs text-elf-muted hover:text-elf-deep underline underline-offset-2"
                >
                  change
                </button>
                <UnlinkButton
                  codename={codename}
                  slug={slug}
                  onUnlinked={() => {
                    setLinked(null);
                    router.refresh();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-elf-muted mb-3">No repo linked yet.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-sm text-elf-deep underline underline-offset-2"
            >
              Link a GitHub repo →
            </button>
          )}
        </div>
      )}

      {pickerOpen && canEdit && (
        <RepoPicker
          codename={codename}
          slug={slug}
          onClose={() => setPickerOpen(false)}
          onLinked={(repo) => {
            setLinked(repo);
            setPickerOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SyncButton({
  codename,
  slug,
  onSynced
}: {
  codename: string;
  slug: string;
  onSynced: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function trigger() {
    startTransition(async () => {
      setResult(null);
      try {
        const res = await fetch(
          `/api/workspaces/${codename}/projects/${slug}/github/sync`,
          { method: "POST" }
        );
        const json = (await res.json()) as {
          imported?: number;
          skipped?: number;
          message?: string;
        };
        if (!res.ok) {
          setResult(json.message ?? "Sync failed.");
          return;
        }
        setResult(
          json.imported === 0
            ? "Already up to date."
            : `Imported ${json.imported} commit${json.imported === 1 ? "" : "s"}.`
        );
        onSynced();
      } catch (err) {
        setResult(err instanceof Error ? err.message : "Network error.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="text-sm inline-flex items-center gap-1.5 text-elf-deep hover:text-elf-forest disabled:opacity-60"
      >
        <SyncIcon spinning={pending} />
        {pending ? "Syncing…" : "Sync recent commits from GitHub"}
      </button>
      {result && (
        <p className="text-xs text-elf-muted mt-1.5">{result}</p>
      )}
    </div>
  );
}

function SyncIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : ""}
      aria-hidden="true"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function UnlinkButton({
  codename,
  slug,
  onUnlinked
}: {
  codename: string;
  slug: string;
  onUnlinked: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await fetch(
            `/api/workspaces/${codename}/projects/${slug}/github`,
            { method: "DELETE" }
          );
          if (res.ok) onUnlinked();
        })
      }
      className="text-xs text-elf-muted hover:text-red-700 underline underline-offset-2 disabled:opacity-50"
    >
      {pending ? "unlinking…" : "unlink"}
    </button>
  );
}

function RepoPicker({
  codename,
  slug,
  onClose,
  onLinked
}: {
  codename: string;
  slug: string;
  onClose: () => void;
  onLinked: (repo: string) => void;
}) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/github/repos");
        const json = (await res.json()) as { repos?: Repo[]; message?: string };
        if (!res.ok) {
          setError(json.message ?? "Could not load repos.");
          return;
        }
        setRepos(json.repos ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = (repos ?? []).filter((r) =>
    r.full_name.toLowerCase().includes(filter.toLowerCase())
  );

  async function link(full_name: string) {
    setLinking(full_name);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/github`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repo: full_name })
        }
      );
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string };
        setError(json.message ?? `Link failed (${res.status}).`);
        setLinking(null);
        return;
      }
      onLinked(full_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setLinking(null);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-elf-forest/30 z-40"
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Pick a GitHub repo"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[85vh] flex flex-col bg-elf-warm-white border-hair rounded-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-hair flex items-center justify-between gap-3">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid">
            link a github repo
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-elf-muted hover:text-elf-deep p-1"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-3 border-b border-hair">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter…"
            autoFocus
            className="w-full h-10 px-3 rounded-input border-hair bg-elf-warm-white text-sm text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-6 text-sm text-elf-muted">loading repos…</div>}
          {error && (
            <div className="p-5 text-sm text-red-700 border-hair rounded-input m-5 bg-red-50">
              {error}
              {error.toLowerCase().includes("token") && (
                <p className="text-xs text-elf-muted mt-2">
                  Sign out and sign in again with GitHub to grant repo access.
                </p>
              )}
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="p-6 text-sm text-elf-muted">No repos match.</div>
          )}
          <ul className="divide-y divide-elf-border">
            {filtered.map((repo) => (
              <li key={repo.id}>
                <button
                  type="button"
                  disabled={!!linking}
                  onClick={() => link(repo.full_name)}
                  className={cn(
                    "w-full text-left px-5 py-3 hover:bg-elf-border/30 transition-colors disabled:opacity-50",
                    linking === repo.full_name && "bg-elf-mint/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="mono text-sm text-elf-ink truncate">
                      {repo.full_name}
                    </span>
                    {repo.private && (
                      <span className="mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-badge bg-elf-border/40 text-elf-muted">
                        private
                      </span>
                    )}
                    {repo.language && (
                      <span className="text-[11px] text-elf-muted">{repo.language}</span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-elf-muted line-clamp-1">
                      {repo.description}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
