"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HeroScene — the maximalist hero illustration.
 *
 * What's in it:
 *   - A wooden shelf with three project cards (Stellar / PocketLedger / NicheCast)
 *   - The refined ShelfElf perched on the shelf, blinking, breathing, ear-wiggling,
 *     occasionally peeking down to "read" the cards
 *   - A pulsing "active" dot on Stellar Program (most-recent-active project)
 *   - An ambient grid + floating commit-type badges drifting in the background
 *   - Mouse parallax: every layer drifts a different distance as you move the cursor
 *   - Scroll parallax: the elf and shelf rise gently as the user scrolls past
 *   - A live commit ticker at the bottom showing recent activity, types cycling
 *
 * Drop-in: import HeroScene from this file, render alongside your Hero text.
 */
export function HeroScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [scroll, setScroll] = useState(0);
  const [tickIdx, setTickIdx] = useState(0);

  // Mouse parallax — normalized to -1..1 around the scene center
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      setMouse({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    };
    const onLeave = () => setMouse({ x: 0, y: 0 });
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Scroll parallax — capped so the scene never drifts off screen
  useEffect(() => {
    const onScroll = () => setScroll(Math.min(window.scrollY * 0.15, 60));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Commit ticker — cycles every 3.2s
  useEffect(() => {
    const t = setInterval(() => setTickIdx((i) => (i + 1) % TICKER.length), 3200);
    return () => clearInterval(t);
  }, []);

  const pX = (depth: number) => mouse.x * depth;
  const pY = (depth: number) => mouse.y * depth;

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-[4/5] md:aspect-[5/6] lg:aspect-square overflow-hidden rounded-card"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 40%, #F1EFE8 0%, #E8E4D8 60%, #D9D4C5 100%)"
      }}
      aria-hidden="true"
    >
      <SceneStyles />

      {/* ── L1: ambient grid (deepest, drifts most) ─────────────── */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          transform: `translate(${pX(-12)}px, ${pY(-12) - scroll * 0.3}px)`,
          backgroundImage:
            "linear-gradient(rgba(15,61,43,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(15,61,43,0.07) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* ── L2: floating commit badges (background depth) ───────── */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pX(-8)}px, ${pY(-8) - scroll * 0.4}px)`
        }}
      >
        <FloatBadge type="feat" top="12%" left="8%" delay={0} />
        <FloatBadge type="content" top="22%" left="78%" delay={1.4} />
        <FloatBadge type="audit" top="68%" left="6%" delay={2.8} />
        <FloatBadge type="ref" top="58%" left="84%" delay={0.7} />
        <FloatBadge type="docs" top="84%" left="72%" delay={2.1} />
      </div>

      {/* ── L3: ambient sparkles ────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pX(-15)}px, ${pY(-15) - scroll * 0.5}px)`
        }}
      >
        <Sparkle top="18%" left="30%" delay={0} />
        <Sparkle top="34%" left="68%" delay={1.2} />
        <Sparkle top="74%" left="44%" delay={2.4} />
        <Sparkle top="50%" left="14%" delay={0.6} />
      </div>

      {/* ── L4: SHELF + project cards (mid layer, the anchor) ───── */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pX(6)}px, ${pY(6) - scroll * 0.7}px)`
        }}
      >
        <ShelfWithCards />
      </div>

      {/* ── L5: THE ELF — front layer, drifts most ──────────────── */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pX(14)}px, ${pY(14) - scroll * 0.9}px)`
        }}
      >
        <RefinedShelfElf />
      </div>

      {/* ── L6: live commit ticker, locked to bottom ────────────── */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
        <CommitTicker idx={tickIdx} />
      </div>

      {/* ── L7: subtle vignette ─────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 50%, rgba(15,61,43,0.08) 100%)"
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   THE SHELF + 3 project cards
   Drawn as positioned divs with brand colors. Wood grain via
   layered gradients. Each card has a subtle hover lift.
   ──────────────────────────────────────────────────────────── */
function ShelfWithCards() {
  return (
    <div
      className="absolute"
      style={{ left: "8%", right: "8%", top: "44%", bottom: "20%" }}
    >
      {/* Cards perched on the shelf */}
      <div className="absolute inset-x-0 bottom-[28px] flex justify-between items-end px-[2%]">
        <ProjectCard
          name="Stellar"
          niche="EdTech"
          status="active"
          delay={0.2}
          rotate={-2}
        />
        <ProjectCard
          name="PocketLedger"
          niche="FinTech"
          status="wip"
          delay={0.5}
          rotate={1}
        />
        <ProjectCard
          name="NicheCast"
          niche="Media"
          status="concept"
          delay={0.8}
          rotate={-1}
        />
      </div>

      {/* The shelf plank — wood texture via layered gradients */}
      <div
        className="absolute inset-x-0 bottom-0 h-[24px] rounded-[3px]"
        style={{
          background: `
            linear-gradient(180deg,
              #8B6F47 0%,
              #7A5F3D 8%,
              #6B5234 60%,
              #5A4429 100%
            )`,
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 16px -4px rgba(15,61,43,0.25), 0 2px 0 rgba(15,61,43,0.4)"
        }}
      >
        {/* Wood grain striations */}
        <div
          className="absolute inset-0 opacity-[0.25]"
          style={{
            background:
              "repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(0,0,0,0.15) 30px, rgba(0,0,0,0.15) 31px, transparent 31px, transparent 70px, rgba(0,0,0,0.08) 70px, rgba(0,0,0,0.08) 71px)"
          }}
        />
        {/* Highlight on top */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-[rgba(255,255,255,0.25)]" />
      </div>

      {/* Shelf bracket (left + right) */}
      <ShelfBracket side="left" />
      <ShelfBracket side="right" />
    </div>
  );
}

function ShelfBracket({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="absolute bottom-[-6px] w-[14px] h-[28px]"
      style={{
        [side]: "-2px",
        background: "linear-gradient(180deg, #5A4429 0%, #3F2F1C 100%)",
        clipPath:
          side === "left"
            ? "polygon(0 0, 100% 0, 100% 100%, 30% 100%)"
            : "polygon(0 0, 100% 0, 70% 100%, 0 100%)"
      }}
    />
  );
}

function ProjectCard({
  name,
  niche,
  status,
  delay,
  rotate
}: {
  name: string;
  niche: string;
  status: "active" | "wip" | "concept";
  delay: number;
  rotate: number;
}) {
  const dot = { active: "#1D9E75", wip: "#BA7517", concept: "#534AB7" }[status];
  const pulse = status === "active";

  return (
    <div
      className="relative w-[28%] aspect-[5/7] group cursor-pointer"
      style={{
        animation: `cardSettle 0.8s ${delay}s cubic-bezier(0.34, 1.56, 0.64, 1) both, cardBob 5s ${delay}s ease-in-out infinite`,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "bottom center"
      }}
    >
      <div
        className="absolute inset-0 rounded-[8px] border-[0.5px] border-elf-border bg-elf-warm-white p-[10%] flex flex-col justify-between transition-transform duration-300 group-hover:-translate-y-1"
        style={{
          boxShadow:
            "0 4px 8px -2px rgba(15,61,43,0.15), 0 1px 2px rgba(15,61,43,0.08)"
        }}
      >
        {/* Card header */}
        <div>
          <div className="flex items-start justify-between gap-1">
            <div
              className="text-[8px] md:text-[9px] font-medium text-elf-forest leading-tight truncate"
              style={{ fontFamily: "var(--font-display, Georgia), serif" }}
            >
              {name}
            </div>
            <div className="relative shrink-0">
              <div
                className="w-[5px] h-[5px] rounded-full"
                style={{ background: dot }}
              />
              {pulse && (
                <div
                  className="absolute inset-0 w-[5px] h-[5px] rounded-full"
                  style={{
                    background: dot,
                    animation: "dotPulse 2s ease-in-out infinite"
                  }}
                />
              )}
            </div>
          </div>
          <div
            className="text-[6px] md:text-[7px] uppercase tracking-wider text-elf-muted mt-1"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            {niche}
          </div>
        </div>

        {/* Mini stack tags */}
        <div className="flex flex-wrap gap-[2px]">
          <span className="text-[5px] md:text-[6px] px-[3px] py-[1px] rounded-[2px] bg-elf-border/40 text-elf-muted">
            ts
          </span>
          <span className="text-[5px] md:text-[6px] px-[3px] py-[1px] rounded-[2px] bg-elf-border/40 text-elf-muted">
            pg
          </span>
        </div>

        {/* Mini avatar row */}
        <div className="flex gap-[-2px] items-center">
          <div className="w-[8px] h-[8px] rounded-full bg-elf-deep border border-elf-warm-white" />
          <div
            className="w-[8px] h-[8px] rounded-full bg-elf-mint border border-elf-warm-white -ml-[3px]"
          />
        </div>
      </div>

      {/* Card shadow on shelf */}
      <div
        className="absolute -bottom-[2px] inset-x-[8%] h-[3px] rounded-full bg-elf-forest/30 blur-[2px]"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   THE REFINED SHELF ELF
   More detail than v1 — proper hat with band + buckle, chunkier
   shoes, scarf, hands, and an actively animated reading state.
   The elf sits perched on the shelf and occasionally peeks down
   at the cards as if checking on the projects.
   ──────────────────────────────────────────────────────────── */
function RefinedShelfElf() {
  const [blink, setBlink] = useState(false);
  const [reading, setReading] = useState(false);
  const [wave, setWave] = useState(false);

  useEffect(() => {
    const blinkLoop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    };
    const i1 = setInterval(blinkLoop, 3000 + Math.random() * 2200);

    const readLoop = () => {
      setReading(true);
      setTimeout(() => setReading(false), 2400);
    };
    const i2 = setInterval(readLoop, 7000 + Math.random() * 3000);

    // Initial wave once on mount
    setTimeout(() => {
      setWave(true);
      setTimeout(() => setWave(false), 1600);
    }, 800);

    return () => {
      clearInterval(i1);
      clearInterval(i2);
    };
  }, []);

  return (
    <div
      className="absolute"
      style={{
        left: "12%",
        top: "16%",
        width: "32%",
        animation: "elfFloat 6s ease-in-out infinite, elfArrive 0.9s 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both"
      }}
    >
      <svg
        viewBox="0 0 200 240"
        className="w-full h-auto"
        style={{
          filter: "drop-shadow(0 8px 20px rgba(15,61,43,0.18))",
          animation: reading ? "elfTiltDown 2.4s ease-in-out" : "none"
        }}
      >
        {/* ── HAT ── refined cone with band + buckle + tip pompom */}
        <g style={{ animation: "hatSway 3.5s ease-in-out infinite", transformOrigin: "100px 60px" }}>
          {/* Hat brim */}
          <ellipse cx="100" cy="62" rx="48" ry="10" fill="#0A2D1F" />
          <ellipse cx="100" cy="60" rx="48" ry="9" fill="#0F3D2B" />
          {/* Hat body — proper cone with curl */}
          <path
            d="M 60 60 Q 76 8 100 6 Q 124 8 140 60 Z"
            fill="#0F3D2B"
          />
          {/* Inner shading */}
          <path
            d="M 100 6 Q 124 8 140 60 L 134 60 Q 122 18 100 12 Z"
            fill="#0A2D1F"
            opacity="0.6"
          />
          {/* Hat band */}
          <path
            d="M 64 50 Q 100 56 136 50 L 138 60 Q 100 66 62 60 Z"
            fill="#0F6E56"
          />
          {/* Buckle */}
          <rect x="92" y="50" width="16" height="10" rx="1.5" fill="#9FE1CB" stroke="#0A2D1F" strokeWidth="0.8" />
          <rect x="95" y="52" width="10" height="6" rx="0.5" fill="none" stroke="#0A2D1F" strokeWidth="0.8" />
          {/* Tip pompom */}
          <circle cx="100" cy="6" r="6" fill="#9FE1CB" />
          <circle cx="98" cy="4" r="2" fill="#FFFFFF" opacity="0.5" />
          {/* Hat curl — slight bend at tip */}
          <path
            d="M 100 0 Q 96 4 100 8"
            stroke="#0F3D2B"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.5"
          />
        </g>

        {/* ── EARS ── pointed elf ears with inner shading ── */}
        <g style={{ animation: "earTwitch 5s ease-in-out infinite", transformOrigin: "55px 100px" }}>
          <path d="M 60 100 L 38 80 Q 32 92 42 110 Z" fill="#F1EFE8" />
          <path d="M 58 100 L 44 90 Q 42 100 48 108 Z" fill="#E0D5C2" />
        </g>
        <g style={{ animation: "earTwitch 5s 0.3s ease-in-out infinite", transformOrigin: "145px 100px" }}>
          <path d="M 140 100 L 162 80 Q 168 92 158 110 Z" fill="#F1EFE8" />
          <path d="M 142 100 L 156 90 Q 158 100 152 108 Z" fill="#E0D5C2" />
        </g>

        {/* ── HEAD ── */}
        <ellipse cx="100" cy="105" rx="42" ry="44" fill="#F1EFE8" />
        {/* Head shading */}
        <ellipse cx="100" cy="115" rx="40" ry="34" fill="#E8E0CB" opacity="0.4" />

        {/* ── CHEEKS ── soft pink */}
        <ellipse
          cx="72"
          cy="118"
          rx="9"
          ry="6"
          fill="#E8AA94"
          opacity="0.55"
        />
        <ellipse
          cx="128"
          cy="118"
          rx="9"
          ry="6"
          fill="#E8AA94"
          opacity="0.55"
        />

        {/* ── EYEBROWS ── */}
        <path
          d="M 72 92 Q 80 89 88 92"
          stroke="#2C2C2A"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 112 92 Q 120 89 128 92"
          stroke="#2C2C2A"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* ── EYES ── */}
        <g style={{ transform: blink ? "scaleY(0.05)" : "scaleY(1)", transformOrigin: "100px 105px", transition: "transform 0.08s" }}>
          {/* Left eye */}
          <ellipse cx="80" cy="105" rx="7" ry="9" fill="#FFFFFF" />
          <ellipse cx="80" cy="106" rx="5.5" ry="7" fill="#0F6E56" />
          <circle cx={reading ? 79 : 81} cy={reading ? 110 : 105} r="3" fill="#0F3D2B" />
          <circle cx={reading ? 80.5 : 82.5} cy={reading ? 108.5 : 103} r="1.4" fill="#FFFFFF" />
          <circle cx={reading ? 78 : 80} cy={reading ? 109 : 104} r="0.7" fill="#FFFFFF" opacity="0.7" />

          {/* Right eye */}
          <ellipse cx="120" cy="105" rx="7" ry="9" fill="#FFFFFF" />
          <ellipse cx="120" cy="106" rx="5.5" ry="7" fill="#0F6E56" />
          <circle cx={reading ? 119 : 121} cy={reading ? 110 : 105} r="3" fill="#0F3D2B" />
          <circle cx={reading ? 120.5 : 122.5} cy={reading ? 108.5 : 103} r="1.4" fill="#FFFFFF" />
          <circle cx={reading ? 118 : 120} cy={reading ? 109 : 104} r="0.7" fill="#FFFFFF" opacity="0.7" />
        </g>

        {/* ── NOSE ── small button */}
        <ellipse cx="100" cy="120" rx="3.5" ry="2.5" fill="#E8AA94" />
        <ellipse cx="99" cy="119" rx="1" ry="0.6" fill="#FFFFFF" opacity="0.6" />

        {/* ── MOUTH ── shifts based on reading */}
        <path
          d={
            reading
              ? "M 90 134 Q 100 132 110 134"
              : "M 88 132 Q 100 142 112 132"
          }
          fill="none"
          stroke="#2C2C2A"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ transition: "d 0.4s ease" }}
        />

        {/* ── SCARF ── adds personality */}
        <path
          d="M 60 148 Q 100 156 140 148 L 142 162 Q 100 168 58 162 Z"
          fill="#9FE1CB"
        />
        <path
          d="M 60 148 Q 100 156 140 148 L 142 162 Q 100 168 58 162 Z"
          fill="none"
          stroke="#1D9E75"
          strokeWidth="1"
          opacity="0.4"
        />
        {/* Scarf knot */}
        <path d="M 78 156 L 70 178 L 86 168 Z" fill="#9FE1CB" />
        <path d="M 78 156 L 70 178 L 86 168 Z" fill="none" stroke="#1D9E75" strokeWidth="1" opacity="0.4" />
        <path d="M 70 178 L 76 188 L 78 174 Z" fill="#9FE1CB" />

        {/* ── BODY/COAT ── forest green coat */}
        <path
          d="M 70 158 Q 100 168 130 158 L 138 220 Q 100 230 62 220 Z"
          fill="#0F6E56"
        />
        {/* Coat front line */}
        <path
          d="M 100 168 L 100 226"
          stroke="#0F3D2B"
          strokeWidth="1.5"
          opacity="0.5"
        />
        {/* Buttons */}
        <circle cx="100" cy="180" r="2" fill="#9FE1CB" />
        <circle cx="100" cy="195" r="2" fill="#9FE1CB" />
        <circle cx="100" cy="210" r="2" fill="#9FE1CB" />

        {/* ── ARMS — left arm waves, right arm holds clipboard ── */}
        <g style={{ animation: wave ? "armWave 1.6s ease-in-out" : "none", transformOrigin: "70px 175px" }}>
          {/* Left arm */}
          <path
            d="M 70 170 Q 56 180 50 200 Q 48 208 54 210"
            stroke="#0F6E56"
            strokeWidth="11"
            fill="none"
            strokeLinecap="round"
          />
          {/* Left hand */}
          <circle cx="52" cy="208" r="6" fill="#F1EFE8" />
          <circle cx="50" cy="206" r="1.5" fill="#E8AA94" opacity="0.5" />
        </g>

        {/* Right arm holding tiny clipboard */}
        <path
          d="M 130 170 Q 142 180 144 200"
          stroke="#0F6E56"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
        />
        {/* Right hand */}
        <circle cx="144" cy="202" r="6" fill="#F1EFE8" />
        {/* Tiny clipboard */}
        <g style={{ animation: "clipboardBob 4s ease-in-out infinite" }}>
          <rect x="148" y="194" width="14" height="18" rx="1.5" fill="#F1EFE8" stroke="#5F5E5A" strokeWidth="0.6" />
          <rect x="153" y="192" width="4" height="3" rx="0.5" fill="#5F5E5A" />
          <line x1="151" y1="200" x2="159" y2="200" stroke="#1D9E75" strokeWidth="0.8" />
          <line x1="151" y1="204" x2="159" y2="204" stroke="#5F5E5A" strokeWidth="0.5" opacity="0.5" />
          <line x1="151" y1="207" x2="157" y2="207" stroke="#5F5E5A" strokeWidth="0.5" opacity="0.5" />
        </g>

        {/* ── LEGS — sitting/dangling, bent at the knees ── */}
        <path
          d="M 80 222 Q 78 236 76 244"
          stroke="#0F3D2B"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 120 222 Q 122 236 124 244"
          stroke="#0F3D2B"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />

        {/* ── SHOES — chunky elf boots with curled toes ── */}
        <g style={{ animation: "feetSwing 3s ease-in-out infinite" }}>
          <path
            d="M 70 244 Q 68 250 76 252 Q 84 252 86 246 Q 88 240 80 240 Z"
            fill="#0A2D1F"
          />
          <circle cx="86" cy="244" r="1.5" fill="#9FE1CB" />
        </g>
        <g style={{ animation: "feetSwing 3s 0.3s ease-in-out infinite" }}>
          <path
            d="M 130 244 Q 132 250 124 252 Q 116 252 114 246 Q 112 240 120 240 Z"
            fill="#0A2D1F"
          />
          <circle cx="114" cy="244" r="1.5" fill="#9FE1CB" />
        </g>

        {/* ── READING SCAN LINE — appears during "reading" state ── */}
        {reading && (
          <rect
            x="62"
            y="100"
            width="76"
            height="2"
            fill="#9FE1CB"
            opacity="0.7"
            style={{ animation: "scanSweep 2.4s ease-in-out" }}
          />
        )}

        {/* ── THOUGHT BUBBLE — pops up when reading ── */}
        {reading && (
          <g style={{ animation: "bubblePop 0.4s ease-out" }}>
            <circle cx="158" cy="60" r="14" fill="#FFFFFF" stroke="#0F6E56" strokeWidth="1.5" />
            <circle cx="148" cy="76" r="4" fill="#FFFFFF" stroke="#0F6E56" strokeWidth="1" />
            <circle cx="142" cy="86" r="2" fill="#FFFFFF" stroke="#0F6E56" strokeWidth="0.8" />
            <text
              x="158"
              y="65"
              textAnchor="middle"
              fontSize="14"
              fill="#0F6E56"
              fontFamily="Georgia, serif"
              fontWeight="bold"
            >
              ✓
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   AMBIENT FLOATING ELEMENTS
   ──────────────────────────────────────────────────────────── */
function FloatBadge({
  type,
  top,
  left,
  delay
}: {
  type: keyof typeof BADGE_COLORS;
  top: string;
  left: string;
  delay: number;
}) {
  const c = BADGE_COLORS[type];
  return (
    <div
      className="absolute"
      style={{
        top,
        left,
        animation: `badgeDrift 9s ${delay}s ease-in-out infinite, badgeFade 9s ${delay}s ease-in-out infinite`
      }}
    >
      <div
        className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[9px] md:text-[10px] font-medium"
        style={{
          background: c.bg,
          color: c.text,
          fontFamily: "var(--font-mono, monospace)"
        }}
      >
        <span
          className="w-[5px] h-[5px] rounded-full"
          style={{ background: c.dot }}
        />
        {type}
      </div>
    </div>
  );
}

function Sparkle({
  top,
  left,
  delay
}: {
  top: string;
  left: string;
  delay: number;
}) {
  return (
    <div
      className="absolute w-2 h-2"
      style={{
        top,
        left,
        animation: `sparkleTwinkle 3s ${delay}s ease-in-out infinite`
      }}
    >
      <svg viewBox="0 0 16 16" className="w-full h-full">
        <path
          d="M 8 0 L 9 6 L 16 8 L 9 10 L 8 16 L 7 10 L 0 8 L 7 6 Z"
          fill="#1D9E75"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   COMMIT TICKER — live activity at the bottom
   ──────────────────────────────────────────────────────────── */
const TICKER = [
  { type: "feat", who: "yusuf", text: "github oauth lands" },
  { type: "content", who: "michael", text: "onboarding draft 2" },
  { type: "audit", who: "yusuf", text: "schema review for v2" },
  { type: "ref", who: "michael", text: "pitch deck attached" },
  { type: "fix", who: "yusuf", text: "fork approval modal" }
] as const;

function CommitTicker({ idx }: { idx: number }) {
  const c = TICKER[idx];
  const colors = BADGE_COLORS[c.type as keyof typeof BADGE_COLORS];
  return (
    <div
      key={idx}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-elf-warm-white border-[0.5px] border-elf-border"
      style={{
        animation: "tickerSlide 3.2s ease-in-out",
        boxShadow: "0 4px 12px rgba(15,61,43,0.08)"
      }}
    >
      <span
        className="text-[9px] uppercase tracking-wider font-medium px-1.5 py-[1px] rounded"
        style={{
          background: colors.bg,
          color: colors.text,
          fontFamily: "var(--font-mono, monospace)"
        }}
      >
        {c.type}
      </span>
      <span className="text-[10px] text-elf-ink">
        <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{c.who}</span>
        <span className="text-elf-muted"> · {c.text}</span>
      </span>
      <span
        className="w-1.5 h-1.5 rounded-full bg-elf-mid"
        style={{ animation: "dotPulse 1.5s ease-in-out infinite" }}
      />
    </div>
  );
}

const BADGE_COLORS = {
  feat: { bg: "#E1F5EE", text: "#085041", dot: "#1D9E75" },
  fix: { bg: "#FCEBEB", text: "#A32D2D", dot: "#D85A30" },
  audit: { bg: "#FAEEDA", text: "#633806", dot: "#BA7517" },
  ref: { bg: "#EEEDFE", text: "#3C3489", dot: "#534AB7" },
  docs: { bg: "#E1F5EE", text: "#0F6E56", dot: "#0F6E56" },
  content: { bg: "#FBEAF0", text: "#72243E", dot: "#C94070" }
};

/* ────────────────────────────────────────────────────────────────
   KEYFRAMES
   ──────────────────────────────────────────────────────────── */
function SceneStyles() {
  return (
    <style>{`
      @keyframes elfFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      @keyframes elfArrive {
        0% { transform: translateY(40px) scale(0.85); opacity: 0; }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }
      @keyframes elfTiltDown {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(6deg); }
      }
      @keyframes hatSway {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-2deg); }
      }
      @keyframes earTwitch {
        0%, 88%, 100% { transform: rotate(0deg); }
        92% { transform: rotate(-12deg); }
        96% { transform: rotate(8deg); }
      }
      @keyframes armWave {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(-25deg); }
        40% { transform: rotate(15deg); }
        60% { transform: rotate(-20deg); }
        80% { transform: rotate(10deg); }
      }
      @keyframes feetSwing {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-2px) rotate(-3deg); }
      }
      @keyframes clipboardBob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      @keyframes scanSweep {
        0% { transform: translateY(-8px); opacity: 0; }
        20% { opacity: 0.7; }
        80% { opacity: 0.7; }
        100% { transform: translateY(40px); opacity: 0; }
      }
      @keyframes bubblePop {
        0% { transform: scale(0); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes cardSettle {
        0% { transform: translateY(60px) rotate(0deg) scale(0.8); opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes cardBob {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-3px); }
      }
      @keyframes dotPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes badgeDrift {
        0%, 100% { transform: translate(0, 0); }
        25% { transform: translate(8px, -10px); }
        50% { transform: translate(-4px, -16px); }
        75% { transform: translate(-10px, -6px); }
      }
      @keyframes badgeFade {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.9; }
      }
      @keyframes sparkleTwinkle {
        0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
        50% { transform: scale(1) rotate(180deg); opacity: 1; }
      }
      @keyframes tickerSlide {
        0% { transform: translateY(8px); opacity: 0; }
        15% { transform: translateY(0); opacity: 1; }
        85% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-8px); opacity: 0; }
      }
    `}</style>
  );
}