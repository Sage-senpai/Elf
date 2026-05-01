import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { AcceptButton } from "@/components/team/AcceptButton";
import { getSession } from "@/lib/auth/session";
import { findInviteByToken } from "@/db/repositories/invites";

type Props = { params: { token: string } };

export const metadata = { title: "Invite — elf" };

export default async function InvitePage({ params }: Props) {
  const session = await getSession();
  if (!session) {
    // Round-trip through sign-in, then come back to this page.
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${params.token}`)}`);
  }

  const invite = await findInviteByToken(params.token);

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" aria-label="elf">
            <Logo size={28} />
          </Link>
          <HeaderActions
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image
            }}
          />
        </div>
      </header>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-prose border-hair rounded-card p-8">
          {!invite ? (
            <div className="space-y-3">
              <p className="mono text-xs uppercase tracking-widest text-elf-mid">
                invite
              </p>
              <h1 className="display text-2xl text-elf-forest">
                This invite is no longer valid.
              </h1>
              <p className="text-sm text-elf-muted leading-relaxed">
                It may have been accepted already, revoked by a manager, or
                expired. Ask whoever sent it to issue a new one.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="text-sm text-elf-deep hover:text-elf-forest underline underline-offset-2"
                >
                  ← Back to dashboard
                </Link>
              </div>
            </div>
          ) : invite.email.toLowerCase() !==
            session.user.email.toLowerCase() ? (
            <div className="space-y-3">
              <p className="mono text-xs uppercase tracking-widest text-elf-mid">
                invite for {invite.email}
              </p>
              <h1 className="display text-2xl text-elf-forest">
                You&apos;re signed in as someone else.
              </h1>
              <p className="text-sm text-elf-muted leading-relaxed">
                This invite was sent to{" "}
                <span className="mono text-elf-ink">{invite.email}</span>, but
                you&apos;re signed in as{" "}
                <span className="mono text-elf-ink">{session.user.email}</span>.
                Sign out and sign back in with the invited email to accept.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="mono text-xs uppercase tracking-widest text-elf-mid">
                you&apos;re invited
              </p>
              <h1 className="display text-3xl text-elf-forest leading-tight">
                Join {invite.workspaceDisplayName}
              </h1>
              <div className="text-sm text-elf-muted leading-relaxed space-y-1">
                <p>
                  {invite.inviterName ?? "A manager"} invited you to{" "}
                  <span className="mono text-elf-ink">
                    {invite.workspaceCodename}
                  </span>{" "}
                  as a{" "}
                  <span className="mono text-elf-ink">{invite.role}</span>.
                </p>
                <p className="text-xs">
                  Invite expires{" "}
                  {new Date(invite.expiresAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}
                  .
                </p>
              </div>
              <AcceptButton token={params.token} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
