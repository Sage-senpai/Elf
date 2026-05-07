"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; section: string };

type Props = {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  user: { name: string; email: string } | null;
  activeSection: string | null;
};

export function MobileMenu({ open, onClose, items, user, activeSection }: Props) {
  // Close on Escape; lock body scroll while open so the underlying page
  // doesn't drift when the user taps a link.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop — fades in/out, doesn't render at all when closed so it
          can't intercept pointer events on touch devices */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-elf-forest/30 backdrop-blur-sm transition-opacity duration-200 md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Panel — slides in from the right. Always rendered (transform vs
          display:none) so the slide animation actually plays. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-[88vw] max-w-sm bg-elf-warm-white border-l border-hair flex flex-col transition-transform duration-300 ease-out md:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-hair">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center"
            aria-label="elf home"
          >
            <Logo size={24} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-button hover:bg-elf-border/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-elf-mint"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-5">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.section}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "block px-3 py-3 rounded-input text-base transition-colors",
                    activeSection === item.section
                      ? "text-elf-deep bg-elf-mint/30"
                      : "text-elf-ink hover:bg-elf-border/30"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-5 pb-6 pt-4 border-t border-hair">
          {user ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-elf-ink">{user.name}</p>
                <p className="mono text-xs text-elf-muted truncate">{user.email}</p>
              </div>
              <Link
                href="/dashboard"
                onClick={onClose}
                className="block w-full text-center h-11 leading-[2.75rem] rounded-button bg-elf-deep text-elf-on-brand text-sm hover:bg-elf-forest"
              >
                Open dashboard
              </Link>
            </div>
          ) : (
            <Link
              href="/sign-in"
              onClick={onClose}
              className="block w-full text-center h-11 leading-[2.75rem] rounded-button bg-elf-deep text-elf-on-brand text-sm hover:bg-elf-forest"
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-elf-ink"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
