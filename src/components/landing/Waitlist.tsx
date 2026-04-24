import { Button } from "@/components/ui/Button";

export function Waitlist() {
  return (
    <section id="waitlist" className="px-6 py-24 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            elficiency unlocked
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-6">
            Your projects on a shelf. Your team in an elf.
          </h2>
          <p className="text-base md:text-lg text-elf-muted leading-relaxed mb-10">
            Closed beta is opening soon for indie builders, small agencies, and
            startup founders running mixed teams. Drop your email, we&apos;ll send
            an invite the moment a slot opens.
          </p>

          <form
            className="flex flex-col sm:flex-row gap-3 max-w-lg"
            action="/api/waitlist"
            method="post"
          >
            <input
              type="email"
              name="email"
              required
              placeholder="you@studio.com"
              className="flex-1 h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
            />
            <Button size="lg" type="submit">
              Request invite
            </Button>
          </form>

          <p className="mono text-xs text-elf-muted mt-4">
            no spam — one email when your slot opens
          </p>
        </div>
      </div>
    </section>
  );
}
