import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type AuthSession } from "./index";

/**
 * Read the current session in a server component, server action, or
 * server-side route. Returns null when the user is signed out.
 *
 * In Next 14 App Router, `headers()` is synchronous — no await needed.
 * If/when we move to Next 15 this will become `await headers()`.
 */
export async function getSession(): Promise<AuthSession | null> {
  const session = await auth.api.getSession({
    headers: headers() as unknown as Headers
  });
  return session ?? null;
}

/**
 * Same as getSession() but redirects to /sign-in when there's no session.
 * Use in page.tsx files that require authentication.
 */
export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}
