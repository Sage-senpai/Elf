"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SignInScene — a refined, minimal animated element for the sign-in page.
 * Features parallax motion and subtle floating animations.
 */
export function SignInScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Mouse parallax
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

  const pX = (depth: number) => mouse.x * depth;
  const pY = (depth: number) => mouse.y * depth;

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-square max-w-md overflow-hidden rounded-card"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 40%, #F1EFE8 0%, #E8E4D8 60%, #D9D4C5 100%)"
      }}
      aria-hidden="true"
    >
      <SceneStyles />

      {/* Ambient grid */}
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          transform: `translate(${pX(-8)}px, ${pY(-8)}px)`,
          backgroundImage:
            "linear-gradient(rgba(15,61,43,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,61,43,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* Floating badge */}
      <div
        className="absolute top-[15%] right-[12%]"
        style={{
          transform: `translate(${pX(-6)}px, ${pY(-6)}px)`
        }}
      >
        <div className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium bg-[#E1F5EE] text-[#085041]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
          secure
        </div>
      </div>

      {/* Floating commit badges */}
      <div
        className="absolute top-[60%] left-[8%]"
        style={{
          transform: `translate(${pX(-4)}px, ${pY(-4)}px)`,
          animation: "floatSlow 6s ease-in-out infinite"
        }}
      >
        <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-[#FAEEDA] text-[#633806]">
          <span className="w-1 h-1 rounded-full bg-[#BA7517]" />
          auth
        </div>
      </div>

      {/* Floating sparkles */}
      <div
        className="absolute top-[25%] left-[18%] w-1.5 h-1.5"
        style={{
          transform: `translate(${pX(-10)}px, ${pY(-10)}px)`,
          animation: "sparkleFloat 4s 0s ease-in-out infinite"
        }}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full">
          <path
            d="M 8 0 L 9 6 L 16 8 L 9 10 L 8 16 L 7 10 L 0 8 L 7 6 Z"
            fill="#1D9E75"
            opacity="0.6"
          />
        </svg>
      </div>

      <div
        className="absolute bottom-[20%] right-[16%] w-1.5 h-1.5"
        style={{
          transform: `translate(${pX(-10)}px, ${pY(-10)}px)`,
          animation: "sparkleFloat 4s 1.2s ease-in-out infinite"
        }}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full">
          <path
            d="M 8 0 L 9 6 L 16 8 L 9 10 L 8 16 L 7 10 L 0 8 L 7 6 Z"
            fill="#1D9E75"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Central animated element */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${pX(4)}px, ${pY(4)}px))`
        }}
      >
        <div
          className="w-32 h-32 rounded-lg border border-elf-border/40 flex items-center justify-center bg-elf-warm-white/40"
          style={{
            animation: "centerFloat 5s ease-in-out infinite",
            boxShadow: "0 16px 32px -8px rgba(15,61,43,0.12)"
          }}
        >
          <svg viewBox="0 0 100 100" className="w-20 h-20">
            {/* Simplified lock icon with animation */}
            <g style={{ animation: "lockRotate 8s ease-in-out infinite" }}>
              {/* Lock body */}
              <rect
                x="30"
                y="50"
                width="40"
                height="30"
                rx="4"
                fill="none"
                stroke="#0F6E56"
                strokeWidth="2"
              />
              {/* Lock shackle */}
              <path
                d="M 40 50 Q 40 30 50 28 Q 60 30 60 50"
                fill="none"
                stroke="#0F6E56"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Keyhole */}
              <circle cx="50" cy="62" r="3" fill="#0F6E56" />
              <circle cx="50" cy="62" r="6" fill="none" stroke="#0F6E56" strokeWidth="1.5" opacity="0.5" />
            </g>
          </svg>
        </div>
      </div>

      {/* Vignette */}
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

function SceneStyles() {
  return (
    <style>{`
      @keyframes centerFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes floatSlow {
        0%, 100% { transform: translate(0, 0); }
        50% { transform: translate(4px, -6px); }
      }
      @keyframes sparkleFloat {
        0%, 100% { transform: scale(0.6) rotate(0deg); opacity: 0.3; }
        50% { transform: scale(1) rotate(180deg); opacity: 0.9; }
      }
      @keyframes lockRotate {
        0%, 100% { transform: rotateZ(0deg); }
        25% { transform: rotateZ(3deg); }
        50% { transform: rotateZ(-2deg); }
        75% { transform: rotateZ(2deg); }
      }
    `}</style>
  );
}
