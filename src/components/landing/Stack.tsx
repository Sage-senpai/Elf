type Layer = {
  partner: string;
  layer: string;
  body: string;
};

const layers: Layer[] = [
  {
    partner: "0G Network",
    layer: "agent memory + audit",
    body: "0G Storage Log keeps every commit and fork approval as a tamper-proof, content-addressed record. 0G Storage KV holds live workspace state. 0G Compute runs the Shelf Agent's reasoning. The agent that watches your shelf, remembers everything, and never forgets."
  },
  {
    partner: "Gensyn AXL",
    layer: "encrypted P2P routing",
    body: "Cowork sessions route through AXL's mesh — peer-to-peer, end-to-end encrypted, no central broker. A dev and a writer can collaborate live with the same Claude agent across separate networks."
  },
  {
    partner: "KeeperHub",
    layer: "guaranteed execution",
    body: "Fork approvals execute through KeeperHub with retries, audit trail, and on-chain settlement. The Shelf Agent pays for its own compute via x402 — no human in the loop, no silent failures."
  },
  {
    partner: "Uniswap",
    layer: "contributor payments",
    body: "Each project gets an optional treasury on Base. When a manager approves a feat or content commit, the contributor gets paid in USDC — or any token they prefer, swapped through the Uniswap API."
  }
];

export function Stack() {
  return (
    <section className="bg-elf-forest text-elf-warm-white px-6 py-24">
      <div className="mx-auto max-w-shell">
        <div className="mb-16 max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mint mb-4">
            the decentralized stack
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-mint leading-tight mb-4">
            Centralized where it should be. Decentralized where it counts.
          </h2>
          <p className="text-base md:text-lg text-elf-warm-white/80 leading-relaxed">
            Built for ETHGlobal OpenAgents 2026. Four sponsors. Four layers.
            One coherent architecture — every integration solves a real product
            problem, not a demo one.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {layers.map((layer) => (
            <div
              key={layer.partner}
              className="border border-hair border-elf-mint/20 rounded-card p-6 md:p-8"
            >
              <div className="flex items-baseline justify-between mb-4 gap-4">
                <h3 className="text-xl text-elf-mint">{layer.partner}</h3>
                <span className="mono text-xs uppercase tracking-widest text-elf-warm-white/60">
                  {layer.layer}
                </span>
              </div>
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
