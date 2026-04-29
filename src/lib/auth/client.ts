"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Browser-side Better Auth client.
 *
 * baseURL resolution mirrors the server:
 *   1. NEXT_PUBLIC_APP_URL — explicit override baked at build time
 *   2. Vercel-injected production URL  — for the prod deployment alias
 *   3. Vercel-injected per-deployment URL — for previews
 *   4. https://elf-it.vercel.app — production fallback
 *
 * If we still end up with the wrong origin in some exotic setup, omitting
 * baseURL lets createAuthClient default to window.location at request time,
 * which is the safest fallback in a browser.
 */
function resolveBaseURL(): string | undefined {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "production") return "https://elf-it.vercel.app";
  return undefined; // fall through to window.location
}

const baseURL = resolveBaseURL();

export const authClient = createAuthClient({
  ...(baseURL ? { baseURL } : {}),
  plugins: [magicLinkClient()]
});

export const { useSession, signIn, signOut } = authClient;
