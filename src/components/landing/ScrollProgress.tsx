"use client";

import { useEffect, useRef } from "react";

/**
 * Hairline mint progress indicator pinned to the top of the viewport.
 * Width tracks scroll position 0..1 of the document. RAF-throttled so
 * the scroll handler stays cheap, and no React re-renders — the bar's
 * width is mutated directly via ref.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = barRef.current;
      if (!el) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[2px] pointer-events-none"
    >
      <div
        ref={barRef}
        className="h-full bg-elf-deep origin-left"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
