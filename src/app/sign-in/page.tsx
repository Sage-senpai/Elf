import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { SignInForm } from "@/components/auth/SignInForm";
import { getSession } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in to elf"
};

export default async function SignInPage() {
  // Already signed in? Send straight to the dashboard.
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b border-hair">
        <Link href="/" className="inline-flex items-center" aria-label="elf home">
          <Logo size={28} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
            welcome back
          </p>
          <h1 className="display text-3xl text-elf-forest leading-tight mb-2">
            Sign in to elf
          </h1>
          <p className="text-sm text-elf-muted mb-8">
            Pick whichever's faster. New here? Either path works for sign-up too.
          </p>

          <SignInForm />

          <p className="text-xs text-elf-muted mt-8">
            By signing in you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </main>
  );
}
