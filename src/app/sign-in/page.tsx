import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignInScene } from "@/components/auth/SignInScene";
import { getSession } from "@/lib/auth/session";

export const metadata = {
  title: "Sign in to elf"
};

export default async function SignInPage() {
  // Already signed in? Send straight to the dashboard.
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col bg-elf-warm-white">
      <header className="px-6 py-5 border-b border-hair">
        <Link href="/" className="inline-flex items-center" aria-label="elf home">
          <Logo size={28} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-8 px-6 py-16">
          {/* Form side */}
          <div className="flex items-center justify-center lg:justify-start">
            <div className="w-full max-w-sm">
              <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
                welcome back
              </p>
              <h1 className="display text-3xl lg:text-4xl text-elf-forest leading-tight mb-2">
                Sign in to elf
              </h1>
              <p className="text-sm text-elf-muted mb-8">
                Pick whichever's faster. New here? Either path works for sign-up too.
              </p>

              <SignInForm />

              <p className="text-xs text-elf-muted mt-8">
                By signing in you agree to our{" "}
                <Link href="/terms" className="hover:text-elf-deep underline">
                  terms of service
                </Link>
                {" "}and{" "}
                <Link href="/privacy" className="hover:text-elf-deep underline">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Scene side — hidden on mobile, shown on lg+ */}
          <div className="hidden lg:flex items-center justify-center">
            <SignInScene />
          </div>
        </div>
      </div>
    </main>
  );
}
