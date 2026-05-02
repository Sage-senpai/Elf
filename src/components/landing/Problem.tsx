type Friction = {
  metric: string;
  body: string;
};

const friction: Friction[] = [
  {
    metric: "3 days",
    body: "between when a dev ships a feature and when the writer who needs to announce it finds out."
  },
  {
    metric: "4 tools",
    body: "the average mixed team uses to coordinate one project — GitHub, Slack, Notion, and a doc nobody updates."
  },
  {
    metric: "0 shared truth",
    body: "across the people building, writing, and shipping. Everyone's working from a different page."
  }
];

export function Problem() {
  return (
    <section className="px-6 py-24 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="mb-16 max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            the problem
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-6">
            The handoff is where products die.
          </h2>
          <p className="text-base md:text-lg text-elf-muted leading-relaxed">
            Mixed teams — devs, writers, designers, managers — don&apos;t fail
            because the work is hard. They fail because nobody has the same
            picture of what exists, what&apos;s in progress, and what&apos;s
            ready to ship. The cost compounds quietly until it&apos;s the
            reason a launch slips.
          </p>
        </div>

        <div className="grid gap-px bg-elf-border md:grid-cols-3">
          {friction.map((item) => (
            <div key={item.metric} className="bg-elf-warm-white p-6 sm:p-8 md:p-10">
              <p className="display text-[2.25rem] sm:text-4xl md:text-5xl text-elf-deep leading-none mb-4">
                {item.metric}
              </p>
              <p className="text-elf-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
