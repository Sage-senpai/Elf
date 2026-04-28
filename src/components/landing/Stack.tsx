type Layer = {
  layer: string;
  title: string;
  body: string;
};

const layers: Layer[] = [
  {
    layer: "permanent record",
    title: "Your audit log outlives any platform.",
    body: "Every commit, fork approval, and contributor payment is content-addressed and tamper-proof. If Elf disappeared tomorrow, your project history stays verifiable. We use 0G's permanent storage layer underneath — you'll never see it, but you'll feel it the day you need to prove what shipped, when, and who approved it."
  },
  {
    layer: "encrypted collaboration",
    title: "Your Cowork sessions don't pass through anyone.",
    body: "Multi-party AI workspaces route through an encrypted peer-to-peer mesh. There's no central inbox watching your team think out loud. The dev, the writer, the manager, and the AI agent all talk on the same channel — privately, end-to-end, no third-party server in the middle."
  },
  {
    layer: "guaranteed execution",
    title: "Your fork approvals can't fail silently.",
    body: "When a manager approves a fork, the GitHub call runs through a guaranteed-execution layer with retries, full audit trail, and on-chain settlement. No more 'I approved it three days ago' / 'I never got it' confusion. Either it shipped, or you get a clear failure with a manual override."
  },
  {
    layer: "trustless payments",
    title: "Pay your contributors without invoices.",
    body: "Project treasuries hold USDC. Approve a contributor's commit, they get paid — in USDC, ETH, or whatever they prefer. No invoicing dance, no payment processor delay, no exchange-rate fight. The contributor walks away with the money they earned, in the asset they wanted."
  }
];

export function Stack() {
  return (
    <section className="bg-elf-forest text-elf-warm-white px-6 py-24">
      <div className="mx-auto max-w-shell">
        <div className="mb-16 max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mint mb-4">
            built to last
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-mint leading-tight mb-4">
            Infrastructure that outlives the platform.
          </h2>
          <p className="text-base md:text-lg text-elf-warm-white/80 leading-relaxed">
            Most workspace tools are a single point of failure — if the
            company shuts down, your team&apos;s history shuts down with it.
            Elf is built differently. The parts that matter — your audit log,
            your payments, your team&apos;s private conversations — don&apos;t
            depend on us being around to read them back.
          </p>
        </div>

        {/* Elf orchestrating four infrastructure nodes around the shelf */}
        <img
          src="/illustrations/stack-orchestration.svg"
          alt=""
          className="block w-full max-w-4xl mx-auto mb-16 rounded-card"
          loading="lazy"
        />

        <div className="grid gap-8 md:grid-cols-2">
          {layers.map((layer) => (
            <div
              key={layer.title}
              className="border border-hair border-elf-mint/20 rounded-card p-6 md:p-8"
            >
              <p className="mono text-xs uppercase tracking-widest text-elf-warm-white/60 mb-4">
                {layer.layer}
              </p>
              <h3 className="text-xl text-elf-mint mb-3 leading-snug">
                {layer.title}
              </h3>
              <p className="text-elf-warm-white/80 leading-relaxed">
                {layer.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
