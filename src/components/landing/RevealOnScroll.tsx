"use client";

import { useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  /** ms delay before the reveal kicks in once the element enters view */
  delay?: number;
  /** What fraction of the element must be visible before revealing (0..1) */
  threshold?: number;
};

/**
 * Wraps children in a div that fades + translates upward once it enters the
 * viewport. One-shot — disconnects the observer after first reveal so the
 * element doesn't re-animate on scroll-up.
 *
 * Visual styles live in globals.css under `.reveal` / `[data-revealed]`.
 * That keeps the per-section markup clean and the easing centralised.
 *
 * Reduced-motion is respected: users with prefers-reduced-motion get the
 * final state immediately, no transition.
 */
export function RevealOnScroll({ children, delay = 0, threshold = 0.12 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.dataset.revealed = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            window.setTimeout(() => (el.dataset.revealed = "true"), delay);
          } else {
            el.dataset.revealed = "true";
          }
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div ref={ref} className="reveal">
      {children}
    </div>
  );
}
