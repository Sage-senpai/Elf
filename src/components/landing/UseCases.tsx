type Persona = {
  who: string;
  title: string;
  body: string;
};

const personas: Persona[] = [
  {
    who: "indie builder",
    title: "You write code. Someone else writes the words.",
    body: "Your content partner gets a real place to draft launch copy, drop screenshots, and react to your commits — without ever opening a terminal."
  },
  {
    who: "small agency",
    title: "Six clients. Twelve contributors. One workspace.",
    body: "Per-project permissions mean a freelance writer never sees the production repo. A subcontractor sees exactly the project they're billed for. Client visibility on demand."
  },
  {
    who: "founding team",
    title: "Founder, designer, two engineers, one growth lead.",
    body: "Each role gets the view they need: a code log for engineering, a content shelf for marketing, a fork-approval queue for whoever&apos;s holding the keys to main."
  },
  {
    who: "product operator",
    title: "Multiple products. One brain.",
    body: "Manage every project, every contributor, every approval from a single shelf. The activity feed is your morning standup — read it once and you're caught up across all of it."
  }
];

export function UseCases() {
  return (
    <section id="use-cases" className="bg-elf-warm-white px-6 py-24 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="mb-16 max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            who it&apos;s for
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-6">
            Built for the way you actually build.
          </h2>
          <p className="text-base md:text-lg text-elf-muted leading-relaxed">
            Mixed-team product work isn&apos;t one shape. Whether you&apos;re a
            duo on a side project or an agency running ten engagements, Elf
            adapts to how your team is actually wired.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {personas.map((persona) => (
            <article
              key={persona.who}
              className="border-hair rounded-card p-7 md:p-8"
            >
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
                {persona.who}
              </p>
              <h3 className="text-xl text-elf-forest mb-3 leading-snug">
                {persona.title}
              </h3>
              <p className="text-elf-muted leading-relaxed">{persona.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
