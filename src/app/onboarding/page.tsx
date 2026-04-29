import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth/session";
import { getUserSettings } from "@/db/repositories/users";
import { OnboardingForm } from "./OnboardingForm";

export const metadata = {
  title: "Onboarding - elf"
};

export default async function OnboardingPage() {
  const session = await requireSession();
  const user = await getUserSettings(session.user.id);
  if (!user) throw new Error("User settings not found.");

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/" className="flex items-center" aria-label="elf home">
            <Logo size={28} />
          </Link>
          <HeaderActions user={{ name: user.name, email: user.email, image: user.image }} />
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-shell">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
                onboarding
              </p>
              <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight mb-5">
                Pick the lens Elf should use first.
              </h1>
              <p className="text-sm text-elf-muted leading-relaxed mb-6">
                Elf is built for mixed teams. Your role choice tunes the first
                prompts, empty states, and shortcuts around what you are most
                likely to do next. Hybrid roles are expected.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button href="/dashboard">Go to dashboard</Button>
                <Button href="/settings" variant="secondary">Account settings</Button>
              </div>
            </div>

            <OnboardingForm user={user} />
          </div>

          <section className="mt-12">
            <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
              what you can do
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {useCases.map((item) => (
                <div key={item.title} className="border-hair rounded-card p-5">
                  <h2 className="text-lg text-elf-forest mb-2">{item.title}</h2>
                  <p className="text-sm text-elf-muted leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

const useCases = [
  {
    title: "Create a workspace",
    body: "Set the shared home for projects, members, permissions, audit, and team activity."
  },
  {
    title: "Link source control",
    body: "Connect GitHub repos so commits and forks become readable team events."
  },
  {
    title: "Request or approve forks",
    body: "Let contributors ask for their own copy while managers keep a deliberate gate."
  },
  {
    title: "Open Cowork",
    body: "Use the AI workspace around project state instead of a blank chatbot."
  },
  {
    title: "Track audit history",
    body: "See workspace actions, future 0G Storage entries, and verification paths."
  },
  {
    title: "Run Shelf Agent",
    body: "Monitor stale projects, summarize state, and prepare autonomous execution."
  },
  {
    title: "Use treasury",
    body: "Create project treasuries, receive deposits, and pay contributors in USDC."
  },
  {
    title: "Tune settings",
    body: "Set username, role experience, demo benefits, and account preferences."
  }
];
