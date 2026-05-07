"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { UserMenu } from "@/components/auth/UserMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/#how", label: "How it works", section: "how" },
  { href: "/#use-cases", label: "Use cases", section: "use-cases" },
  { href: "/#pricing", label: "Pricing", section: "pricing" },
  { href: "/#faq", label: "FAQ", section: "faq" }
];

type Props = {
  user: { name: string; email: string; image?: string | null } | null;
};

export function HeaderShell({ user }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Condense the header once we've passed the top of the page.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the nav item whose section is currently dominant in the viewport.
  // Uses a top-third threshold so the active state changes as the section
  // crosses the upper part of the screen, not the middle.
  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.section))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-200 ease-out",
          // Hairline only appears once scrolled — keeps the page-top clean
          scrolled
            ? "bg-elf-warm-white/85 backdrop-blur-md border-b border-hair"
            : "bg-transparent"
        )}
        style={{
          // Subtle inner glow when scrolled, so the blur reads as separation
          // rather than a hard edge
          boxShadow: scrolled
            ? "0 1px 0 rgba(15,61,43,0.04)"
            : "none"
        }}
      >
        <div
          className={cn(
            "mx-auto max-w-shell px-6 flex items-center justify-between transition-all duration-200 ease-out",
            scrolled ? "py-3" : "py-5"
          )}
        >
          <Link
            href="/"
            className="flex items-center transition-transform duration-200 ease-out hover:opacity-90"
            aria-label="elf home"
          >
            <Logo size={scrolled ? 24 : 28} />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.section}
                href={item.href}
                className={cn(
                  "transition-colors duration-150",
                  active === item.section
                    ? "text-elf-deep"
                    : "text-elf-ink hover:text-elf-deep"
                )}
              >
                <span className="relative inline-block">
                  {item.label}
                  <span
                    className={cn(
                      "absolute left-0 -bottom-1 h-px bg-elf-deep transition-all duration-200 ease-out",
                      active === item.section ? "w-full" : "w-0"
                    )}
                  />
                </span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <UserMenu user={user} />
            ) : (
              <Button href="/sign-in" size="md">
                Sign in
              </Button>
            )}

            {/* Mobile menu trigger — only below md */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-button hover:bg-elf-border/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-elf-mint"
            >
              <Hamburger />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={navItems}
        user={user}
        activeSection={active}
      />
    </>
  );
}

function Hamburger() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-elf-ink"
      aria-hidden="true"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
