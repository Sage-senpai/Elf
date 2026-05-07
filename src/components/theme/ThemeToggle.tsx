"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark" | "system";

/**
 * Theme toggle. Cycles light → dark → system → light.
 *
 * - Persists choice to localStorage under `elf-theme`.
 * - Applies the `dark` class on <html> immediately (no roundtrip).
 * - Listens to system preference changes so "system" reflects them live.
 *
 * Pair with <ThemeScript /> in <head> to avoid a flash on first paint.
 */
export function ThemeToggle({
  variant = "icon",
  className
}: {
  variant?: "icon" | "menu-item";
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (typeof window !== "undefined"
      ? (localStorage.getItem("elf-theme") as Theme | null)
      : null) ?? "system";
    setTheme(stored);
  }, []);

  // Live-update when "system" is selected and the OS preference changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle("dark", mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  function pick(next: Theme) {
    setTheme(next);
    try {
      if (next === "system") localStorage.removeItem("elf-theme");
      else localStorage.setItem("elf-theme", next);
    } catch {
      /* storage blocked */
    }
    const dark =
      next === "dark" ||
      (next === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  function cycle() {
    pick(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  }

  if (!mounted) {
    // Render a placeholder of the right size so layout doesn't shift.
    return variant === "icon" ? (
      <span
        aria-hidden="true"
        className={cn(
          "inline-block w-9 h-9 rounded-button",
          className
        )}
      />
    ) : (
      <span aria-hidden="true" className="inline-block h-9" />
    );
  }

  const label =
    theme === "light"
      ? "Switch to dark theme"
      : theme === "dark"
        ? "Use system theme"
        : "Switch to light theme";

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        onClick={cycle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-sm text-elf-ink hover:bg-elf-border/40 rounded-input",
          className
        )}
      >
        <span className="flex items-center gap-2">
          <ThemeIcon theme={theme} />
          <span>Theme</span>
        </span>
        <span className="text-xs text-elf-muted capitalize">{theme}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-button text-elf-muted hover:text-elf-ink hover:bg-elf-border/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-elf-mint transition-colors",
        className
      )}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") {
    // Moon
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
    );
  }
  if (theme === "light") {
    // Sun
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
        <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
      </svg>
    );
  }
  // System: half-moon / contrast
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18" />
      <path d="M12 3a9 9 0 0 0 0 18" fill="currentColor" />
    </svg>
  );
}
