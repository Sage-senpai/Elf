type CommitMock = {
  type: string;
  scope: string;
  author: string;
  when: string;
  summary: string;
  body: string;
  sha?: string;
};

const commits: CommitMock[] = [
  {
    type: "feat",
    scope: "auth/github",
    author: "Yusuf D.",
    when: "2 hours ago",
    summary: "GitHub OAuth sign-in lands.",
    body: "First-time users now get a one-click path from landing to workspace. Magic link still works as a fallback.",
    sha: "4f3a2b1"
  },
  {
    type: "content",
    scope: "docs/onboarding",
    author: "Michael C.",
    when: "yesterday",
    summary: "Onboarding guide, draft 2.",
    body: "Plain-English walkthrough — no git terminology. Reviewed with two non-technical contributors before merging."
  },
  {
    type: "audit",
    scope: "db/schema",
    author: "Yusuf D.",
    when: "2 days ago",
    summary: "Schema review for the v2 on-chain tables.",
    body: "Verified treasury FK chains, payment status enum coverage, idempotency on KeeperHub workflow IDs.",
    sha: "9d2c0a3"
  }
];

export function CommitShowcase() {
  return (
    <section className="px-6 py-24 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="mb-16 max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            the commit system
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-6">
            Every commit speaks two languages.
          </h2>
          <p className="text-base md:text-lg text-elf-muted leading-relaxed">
            Elf extends Conventional Commits with eleven types — including{" "}
            <span className="mono text-elf-deep">content</span>,{" "}
            <span className="mono text-elf-deep">audit</span>, and{" "}
            <span className="mono text-elf-deep">ref</span>. The same commit
            speaks SHA to your dev and plain English to your writer. Nobody
            sees a wall of jargon they can&apos;t interpret.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl">
          {commits.map((c, i) => (
            <CommitCard key={i} commit={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CommitCard({ commit }: { commit: CommitMock }) {
  return (
    <article className="border-hair rounded-card p-5 md:p-6 bg-elf-warm-white">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <TypeBadge type={commit.type} />
        <span className="mono text-xs text-elf-muted">{commit.scope}</span>
        <span className="text-elf-border">·</span>
        <span className="text-xs text-elf-ink">{commit.author}</span>
        <span className="text-elf-border">·</span>
        <span className="text-xs text-elf-muted">{commit.when}</span>
        {commit.sha && (
          <span className="ml-auto mono text-xs text-elf-muted">
            #{commit.sha}
          </span>
        )}
      </div>
      <p className="text-elf-ink leading-snug mb-1.5">{commit.summary}</p>
      <p className="text-sm text-elf-muted leading-relaxed">{commit.body}</p>
    </article>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="mono text-[11px] uppercase tracking-widest px-2.5 py-1 rounded-badge bg-elf-mint text-elf-forest">
      {type}
    </span>
  );
}
