"use client";

import { useEffect, useState } from "react";
import { CoworkPanel } from "./CoworkPanel";

/**
 * Persistent floating launcher for the Cowork side panel.
 * Listens for keyboard shortcut (Cmd/Ctrl + K) to toggle.
 */
export function CoworkLauncher({
  codename,
  slug
}: {
  codename: string;
  slug: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-button bg-elf-deep text-elf-warm-white text-sm hover:bg-elf-forest shadow-[0_8px_24px_-8px_rgba(15,61,43,0.35)]"
        aria-label="Open Cowork chat"
      >
        <Sparkle />
        <span>Cowork</span>
        <kbd className="mono text-[10px] px-1.5 py-0.5 rounded bg-elf-mint/30 text-elf-mint">
          ⌘K
        </kbd>
      </button>

      <CoworkPanel
        codename={codename}
        slug={slug}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function Sparkle() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M 8 0 L 9 6 L 16 8 L 9 10 L 8 16 L 7 10 L 0 8 L 7 6 Z" />
    </svg>
  );
}
