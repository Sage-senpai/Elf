"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type QA = {
  q: string;
  a: string;
};

const qas: QA[] = [
  {
    q: "Do I have to move off GitHub?",
    a: "No. Elf sits on top of GitHub (and GitLab and Bitbucket) — your code stays exactly where it lives today. Elf is the workspace layer that lets non-technical contributors participate without ever opening a terminal."
  },
  {
    q: "Do my non-technical contributors need to learn git?",
    a: "Never. Content contributors see plain-English commit summaries, attach docs and links, and react to project updates. The words 'fork', 'rebase', and 'merge' don't appear anywhere in their view."
  },
  {
    q: "What's a fork request, and why do I care?",
    a: "It's how a contributor asks for their own copy of a project to work in. In Elf, the project manager has to deliberately approve each one — so production never gets a surprise pull request from someone who shouldn't have access. We make accidental approvals impossible."
  },
  {
    q: "Is my workspace data permanent?",
    a: "Yes. Every commit, fork approval, and contributor payment is written to a tamper-proof audit log. You can verify any historical event independently — even if Elf disappeared tomorrow, your record stays intact."
  },
  {
    q: "How do contributor payments work?",
    a: "Optional and opt-in. Each project can have a USDC treasury. When a manager approves a feat or content commit, the contributor gets paid — in USDC by default, or in any token they prefer. No invoices, no Stripe round-trips."
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from settings, no support ticket required. You keep access through the end of your billing period, and your audit log and project data export to GitHub or stay readable on the permanent log."
  }
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-elf-warm-white px-6 py-24 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr] md:gap-20">
          <div>
            <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
              questions
            </p>
            <h2 className="display text-4xl md:text-5xl text-elf-forest leading-tight">
              Things people ask, before they sign up.
            </h2>
          </div>

          <div className="space-y-px bg-elf-border">
            {qas.map((qa, i) => (
              <div key={qa.q} className="bg-elf-warm-white">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="w-full text-left px-1 py-5 flex items-start justify-between gap-4 group"
                >
                  <span className="text-elf-forest leading-snug group-hover:text-elf-deep">
                    {qa.q}
                  </span>
                  <Plus open={open === i} />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-200 ease-out",
                    open === i ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="text-elf-muted leading-relaxed pr-8">
                      {qa.a}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Plus({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "shrink-0 mt-1 inline-flex items-center justify-center w-5 h-5 transition-transform",
        open && "rotate-45"
      )}
      aria-hidden="true"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-elf-muted"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </span>
  );
}
