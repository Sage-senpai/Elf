type Step = {
  role: string;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    role: "for the dev",
    title: "Commit code, exactly like today.",
    body: "Push to GitHub, GitLab, or Bitbucket. Elf reads the commit, parses the type, and broadcasts what changed — in the language each contributor speaks."
  },
  {
    role: "for the writer",
    title: "Add docs without touching git.",
    body: "Drop a deck, link a Notion page, write a brief. Everything attaches to the project. No SHAs, no merge conflicts, no terminal."
  },
  {
    role: "for the manager",
    title: "Approve forks. Control access. Done.",
    body: "Per-project, per-member permissions. One activity feed. Fork requests need a deliberate two-step approval — you'll never accidentally hand out the keys."
  }
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="mb-16 max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            don&apos;t build by your shelf
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-forest leading-tight">
            One workspace. Every contributor.
          </h2>
        </div>

        {/* Three role panels (dev / writer / manager) flowing into the elf */}
        <img
          src="/illustrations/howitworks-flow.svg"
          alt=""
          className="block w-full max-w-4xl mx-auto mb-16"
          loading="lazy"
        />

        <div className="grid gap-px bg-elf-border md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="bg-elf-warm-white p-8 md:p-10"
            >
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-6">
                {step.role}
              </p>
              <h3 className="text-xl text-elf-forest mb-3 leading-snug">
                {step.title}
              </h3>
              <p className="text-elf-muted leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
