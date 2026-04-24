"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/cn";

type Props = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
};

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClickAway(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClickAway);
    return () => window.removeEventListener("mousedown", onClickAway);
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.refresh();
    router.push("/");
  }

  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-button px-2 py-1 hover:bg-elf-border/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-elf-mint"
      >
        <Avatar image={user.image} initials={initials} />
        <span className="hidden md:inline text-sm text-elf-ink">{user.name}</span>
        <Chevron className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 bg-elf-warm-white border-hair rounded-card overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-hair">
            <p className="text-sm text-elf-ink truncate">{user.name}</p>
            <p className="mono text-xs text-elf-muted truncate">{user.email}</p>
          </div>
          <MenuItem href="/dashboard">Dashboard</MenuItem>
          <MenuItem href="/settings">Settings</MenuItem>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full text-left px-4 py-2.5 text-sm text-elf-ink hover:bg-elf-border/40 border-t border-hair disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 text-sm text-elf-ink hover:bg-elf-border/40"
    >
      {children}
    </Link>
  );
}

function Avatar({ image, initials }: { image?: string | null; initials: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt=""
        className="h-8 w-8 rounded-full border-hair object-cover"
      />
    );
  }
  return (
    <span className="h-8 w-8 rounded-full bg-elf-deep text-elf-mint text-xs flex items-center justify-center">
      {initials || "·"}
    </span>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-elf-muted", className)}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
