"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";

type Status = "idle" | "loading" | "sent" | "error";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onGithub() {
    setStatus("loading");
    setErrorMsg("");
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard"
      });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Sign-in failed.");
    }
  }

  async function onMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/dashboard"
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message ?? "Could not send magic link.");
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="space-y-6">
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onGithub}
        disabled={status === "loading"}
      >
        <GithubMark />
        <span className="ml-2">
          {status === "loading" ? "Opening GitHub…" : "Continue with GitHub"}
        </span>
      </Button>

      <div className="flex items-center gap-3 text-xs text-elf-muted">
        <div className="h-px flex-1 bg-elf-border" />
        <span className="mono uppercase tracking-widest">or</span>
        <div className="h-px flex-1 bg-elf-border" />
      </div>

      {status === "sent" ? (
        <div className="rounded-input border-hair p-4 bg-elf-mint/30">
          <p className="text-sm text-elf-forest">
            Check your inbox at <strong>{email}</strong> for a sign-in link.
          </p>
          <p className="mono text-xs text-elf-muted mt-2">
            no email? check the dev terminal — magic links print there when
            RESEND_API_KEY isn&apos;t set
          </p>
        </div>
      ) : (
        <form onSubmit={onMagicLink} className="space-y-3">
          <label className="block">
            <span className="mono text-xs uppercase tracking-widest text-elf-muted">
              email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              className="mt-2 w-full h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
              disabled={status === "loading"}
            />
          </label>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            type="submit"
            disabled={status === "loading" || !email}
          >
            {status === "loading" ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </form>
      )}

      {status === "error" && (
        <p className="text-sm text-red-700">{errorMsg}</p>
      )}
    </div>
  );
}

function GithubMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
