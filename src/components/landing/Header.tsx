import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { UserMenu } from "@/components/auth/UserMenu";
import { getSession } from "@/lib/auth/session";

export async function Header() {
  const session = await getSession();

  return (
    <header className="px-6 py-5 border-b border-hair">
      <div className="mx-auto max-w-shell flex items-center justify-between">
        <Link href="/" className="flex items-center" aria-label="elf home">
          <Logo size={28} />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-elf-ink">
          <Link href="/#how" className="hover:text-elf-deep transition-colors">
            How it works
          </Link>
          <Link href="/#use-cases" className="hover:text-elf-deep transition-colors">
            Use cases
          </Link>
          <Link href="/#pricing" className="hover:text-elf-deep transition-colors">
            Pricing
          </Link>
          <Link href="/#faq" className="hover:text-elf-deep transition-colors">
            FAQ
          </Link>
        </nav>

        {session ? (
          <UserMenu
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image
            }}
          />
        ) : (
          <Button href="/sign-in" size="md">
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
