import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { UserMenu } from "@/components/auth/UserMenu";
import { requireSession } from "@/lib/auth/session";

export const metadata = {
  title: "Dashboard — elf"
};

export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="elf home">
            <Logo size={28} />
          </Link>
          <UserMenu
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image
            }}
          />
        </div>
      </header>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-shell">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
            you&apos;re in
          </p>
          <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-3">
            Welcome, {session.user.name.split(/\s+/)[0]}.
          </h1>
          <p className="text-base text-elf-muted max-w-prose mb-12">
            This is your workspace shell. The first project shelf, the activity
            feed, and Cowork are next. For now you&apos;re authenticated — your
            session is live and your record is in the database.
          </p>

          <div className="border-hair rounded-card p-6 max-w-prose">
            <h2 className="text-base text-elf-forest mb-2">What&apos;s coming</h2>
            <ul className="text-sm text-elf-muted space-y-1.5">
              <li>· Create your first workspace and shelf project</li>
              <li>· Link a GitHub repo and capture your first commit</li>
              <li>· Invite a content contributor and a manager</li>
              <li>· Open a Cowork session — multi-party over AXL</li>
              <li>· Fund a project treasury and pay your first contributor</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
