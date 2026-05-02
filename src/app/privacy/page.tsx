import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Privacy — elf" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" aria-label="elf home" className="inline-block mb-10">
          <Logo size={28} />
        </Link>
        <h1 className="display text-4xl text-elf-forest mb-6">Privacy</h1>
        <div className="space-y-4 text-elf-ink leading-relaxed">
          <p>
            Elf collects only the data needed to run your workspace: your email
            and basic profile (name, avatar) from your sign-in provider, the
            projects and commits you create, and any wallets you choose to link.
          </p>
          <p>
            We do not sell or share your data. Database records live on our
            managed Postgres host. Audit hashes may be written to the 0G
            decentralized storage network when you opt in.
          </p>
          <p>
            To request deletion of your account and associated data, email{" "}
            <a className="underline" href="mailto:hello@elf.so">hello@elf.so</a>.
          </p>
          <p className="text-sm text-elf-muted pt-4">
            This is a draft. A formal policy will replace it before general
            availability.
          </p>
        </div>
      </div>
    </main>
  );
}
