import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/auth/session";
import { getUserSettings } from "@/db/repositories/users";
import { PreferencesForm, UsernameForm } from "./SettingsForms";

export const metadata = {
  title: "Settings - elf"
};

export default async function SettingsPage() {
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
          <div className="flex items-start justify-between gap-6 flex-wrap mb-10">
            <div>
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
                account settings
              </p>
              <h1 className="display text-4xl md:text-5xl text-elf-forest leading-tight">
                Tune Elf around how you work.
              </h1>
            </div>
            <Button href="/onboarding" variant="secondary">
              Open onboarding
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <SettingsCard title="Profile and experience">
              <PreferencesForm user={user} />
            </SettingsCard>

            <div className="space-y-6">
              <SettingsCard title="Username">
                <UsernameForm user={user} />
              </SettingsCard>
              <SettingsCard title="Account">
                <dl className="space-y-3 text-sm">
                  <Row label="Email" value={user.email} />
                  <Row label="GitHub auth" value="OAuth tokens stored on accounts table" />
                  <Row
                    label="Onboarding"
                    value={user.onboardingCompletedAt ? "Completed" : "Not completed"}
                  />
                  <Row
                    label="Benefit mode"
                    value={user.benefitOverride === "max" ? "Max demo access" : "Standard"}
                  />
                </dl>
              </SettingsCard>
            </div>
          </div>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {capabilityCards.map((card) => (
              <div key={card.title} className="border-hair rounded-card p-5">
                <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
                  {card.label}
                </p>
                <h2 className="text-lg text-elf-forest mb-2">{card.title}</h2>
                <p className="text-sm text-elf-muted leading-relaxed">{card.body}</p>
              </div>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

function SettingsCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-hair rounded-card p-6">
      <h2 className="text-xl text-elf-forest mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-elf-border/60 pb-3 last:border-0 last:pb-0">
      <dt className="text-elf-muted">{label}</dt>
      <dd className="text-right text-elf-forest">{value}</dd>
    </div>
  );
}

const capabilityCards = [
  {
    label: "source",
    title: "GitHub-aware workspace",
    body: "Repo sync, commit context, fork requests, and project shelves stay close to developer flow."
  },
  {
    label: "coordination",
    title: "Mixed-team handoffs",
    body: "Writers, designers, product leads, and managers get readable state without opening a terminal."
  },
  {
    label: "execution",
    title: "Agent and treasury layer",
    body: "Shelf Agent, audit records, cowork sessions, and USDC treasury flows are surfaced from one account."
  }
];
