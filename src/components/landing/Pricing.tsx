import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Plan = {
  name: string;
  price: string;
  period?: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    tagline: "Kick the tires. Spin up a workspace and a few projects.",
    features: [
      "1 workspace, up to 3 projects",
      "Up to 3 contributors",
      "100 Cowork requests / hour",
      "GitHub integration",
      "Activity feed and notifications"
    ],
    cta: "Start free"
  },
  {
    name: "Builder",
    price: "$19",
    period: "/ month",
    tagline: "For indie builders and small mixed teams shipping real work.",
    features: [
      "3 workspaces, 10 projects each",
      "Up to 10 contributors per workspace",
      "Unlimited Cowork",
      "Multi-party Cowork sessions",
      "Project treasury + contributor payments",
      "Permanent on-chain audit trail"
    ],
    cta: "Start Builder",
    highlight: true
  },
  {
    name: "Studio",
    price: "$49",
    period: "/ month",
    tagline: "For agencies, founders, and operators running multiple products.",
    features: [
      "10 workspaces, unlimited projects",
      "Unlimited contributors",
      "Unlimited multi-party Cowork",
      "Unlimited project treasuries",
      "The Shelf Agent — autonomous workspace monitor",
      "Treasury auto-rebalance"
    ],
    cta: "Start Studio"
  }
];

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="mb-16 max-w-prose">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            pricing
          </p>
          <h2 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-6">
            Honest pricing. Upgrade when it pays for itself.
          </h2>
          <p className="text-base md:text-lg text-elf-muted leading-relaxed">
            Start free. Upgrade when your team grows past three people or you
            want to pay contributors on-chain. Cancel anytime — your data and
            audit log come with you.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={cn(
                "rounded-card p-7 md:p-8 flex flex-col",
                plan.highlight
                  ? "bg-elf-forest text-elf-warm-white"
                  : "border-hair bg-elf-warm-white"
              )}
            >
              <div className="mb-6">
                <p
                  className={cn(
                    "mono text-xs uppercase tracking-widest mb-3",
                    plan.highlight ? "text-elf-mint" : "text-elf-mid"
                  )}
                >
                  {plan.name}
                </p>
                <p className="flex items-baseline gap-1.5 mb-3">
                  <span
                    className={cn(
                      "display text-4xl",
                      plan.highlight ? "text-elf-mint" : "text-elf-forest"
                    )}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={cn(
                        "text-sm",
                        plan.highlight
                          ? "text-elf-warm-white/70"
                          : "text-elf-muted"
                      )}
                    >
                      {plan.period}
                    </span>
                  )}
                </p>
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    plan.highlight ? "text-elf-warm-white/85" : "text-elf-muted"
                  )}
                >
                  {plan.tagline}
                </p>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      "flex gap-2.5 text-sm leading-relaxed",
                      plan.highlight
                        ? "text-elf-warm-white/85"
                        : "text-elf-ink"
                    )}
                  >
                    <Check highlight={plan.highlight} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                href="/sign-in"
                variant={plan.highlight ? "secondary" : "primary"}
                className={cn(
                  "w-full",
                  plan.highlight &&
                    "border-elf-mint/40 text-elf-mint hover:bg-elf-mint/10"
                )}
              >
                {plan.cta}
              </Button>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-elf-muted">
          Need SSO, GitHub Enterprise, custom retention, or a dedicated
          support channel?{" "}
          <Link
            href="mailto:hello@elf.so?subject=Enterprise"
            className="text-elf-deep underline underline-offset-2"
          >
            Talk to us about Enterprise
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function Check({ highlight }: { highlight?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "shrink-0 mt-0.5",
        highlight ? "text-elf-mint" : "text-elf-deep"
      )}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
