"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Browser-side Better Auth client. Same baseURL as the server config so
 * sign-in / sign-out / magic-link round-trips hit /api/auth/* on this origin.
 *
 * Exposes the React hooks (useSession) plus the `signIn` / `signOut` helpers
 * used by the sign-in page and the header user menu.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "https://elf-it.vercel.app",
  plugins: [magicLinkClient()]
});

export const { useSession, signIn, signOut } = authClient;
