import { Button } from "@/components/ui/Button";
import { HeroScene } from "./HeroScene";

export function Hero() {
  return (
    <section className="px-5 sm:px-6 pt-16 pb-20 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32 relative overflow-hidden">
      {/* Subtle radial wash behind the whole hero — sets the warm mood */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 80% 30%, rgba(159,225,203,0.18) 0%, transparent 60%)"
        }}
      />

      <div className="mx-auto max-w-shell relative">
        <div className="grid gap-10 sm:gap-12 lg:gap-16 lg:grid-cols-[1.1fr_1fr] items-center">
          {/* Left: original copy, untouched */}
          <div className="max-w-prose">
            <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-6">
              cross-functional builder workspace
            </p>
            <h1 className="display text-[2.75rem] sm:text-5xl md:text-6xl lg:text-7xl text-elf-forest leading-[1.05] mb-6">
              Leave it to elf.
            </h1>
            <p className="text-lg md:text-xl text-elf-ink leading-relaxed mb-2">
              Every great product needs an elf.
            </p>
            <p className="text-base md:text-lg text-elf-muted leading-relaxed mb-10">
              One workspace where developers commit code, content contributors
              add docs and decks, and managers control who sees, touches, or
              forks anything — without anyone leaving the platform or
              switching apps.
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

          {/* Right: the scene */}
          <div className="relative">
            <HeroScene />
          </div>
        </div>
      </div>
    </section>
  );
}