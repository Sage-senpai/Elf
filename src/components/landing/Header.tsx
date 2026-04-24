import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="px-6 py-5 border-b border-hair">
      <div className="mx-auto max-w-shell flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="elf home">
          <Logo size={28} />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-elf-ink">
          <Link href="#how" className="hover:text-elf-deep transition-colors">
            How it works
          </Link>
          <a
            href="https://github.com/elf-so"
            target="_blank"
            rel="noreferrer"
            className="hover:text-elf-deep transition-colors"
          >
            GitHub
          </a>
        </nav>

        <Button href="#waitlist" size="md">
          Join waitlist
        </Button>
      </div>
    </header>
  );
}
