import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Terms — elf" };

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" aria-label="elf home" className="inline-block mb-10">
          <Logo size={28} />
        </Link>
        <h1 className="display text-4xl text-elf-forest mb-6">Terms</h1>
        <div className="space-y-4 text-elf-ink leading-relaxed">
          <p>
            Elf is provided as-is during early access. By signing in you agree
            not to use the platform for unlawful activity, to abuse other users,
            or to attempt to access workspaces you have not been invited to.
          </p>
          <p>
            You retain ownership of code, content, and any project data you
            create. Treasury balances and wallet links are your responsibility
            to safeguard — never share private keys.
          </p>
          <p>
            We may suspend accounts that violate these terms or that put the
            platform at risk. Service availability is best-effort during early
            access and may change without notice.
          </p>
          <p className="text-sm text-elf-muted pt-4">
            This is a draft. Formal terms will replace it before general
            availability.
          </p>
        </div>
      </div>
    </main>
  );
}
