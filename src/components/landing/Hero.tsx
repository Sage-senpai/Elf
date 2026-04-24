import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="px-6 pt-20 pb-24 md:pt-32 md:pb-32">
      <div className="mx-auto max-w-shell">
        <div className="max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-6">
            cross-functional builder workspace
          </p>
          <h1 className="display text-5xl md:text-7xl text-elf-forest leading-[1.05] mb-6">
            Leave it to elf.
          </h1>
          <p className="text-lg md:text-xl text-elf-ink leading-relaxed mb-2">
            Every great product needs an elf.
          </p>
          <p className="text-base md:text-lg text-elf-muted leading-relaxed mb-10">
            One workspace where developers commit code, content contributors add
            docs and decks, and managers control who sees, touches, or forks
            anything — without anyone leaving the platform or switching apps.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button href="#waitlist" size="lg">
              Join the waitlist
            </Button>
            <Button href="#how" variant="secondary" size="lg">
              See how it works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
