import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "@/db/client";
import * as authSchema from "@/db/schema/auth";
import { users } from "@/db/schema/users";
import { sendMagicLinkEmail } from "./email";

/**
 * Pick the base URL Better Auth should use for cookie scope, OAuth callback
 * URLs, and CSRF origin checks. Order of precedence:
 *   1. BETTER_AUTH_URL  — explicit override, set in Vercel for production
 *   2. VERCEL_URL       — auto-injected on Vercel (no scheme), e.g.
 *                         "elf-it-git-main.vercel.app". Vital for preview
 *                         deployments which get a different host every time.
 *   3. https://elf-it.vercel.app — production default
 *   4. http://localhost:3000 — dev default
 */
function resolveBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "production") return "https://elf-it.vercel.app";
  return "http://localhost:3000";
}

const baseURL = resolveBaseURL();

/**
 * Origins Better Auth will accept POST requests from. Same-origin (baseURL)
 * is implicit; we add the production alias + every Vercel-injected URL we
 * can see, so requests from preview deployments don't 500.
 */
const trustedOrigins = Array.from(
  new Set(
    [
      baseURL,
      "https://elf-it.vercel.app",
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : null
    ].filter((u): u is string => !!u)
  )
);

if (!process.env.BETTER_AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET must be set in production.");
}

/**
 * Single Better Auth instance. Imported by both the Hono mount
 * (server/routes/auth.ts) and any server component that calls
 * `auth.api.getSession({ headers })`.
 *
 * Plugins:
 *  - magicLink — passwordless email sign-in. Falls back to console.log when
 *    RESEND_API_KEY is unset, so dev works without external services.
 */
export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  logger: {
    level: "debug"
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: authSchema.sessions,
      account: authSchema.accounts,
      verification: authSchema.verifications
    }
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
      // 'repo' covers both private + public repo metadata and commit reads;
      // 'read:user' + 'user:email' fill in the profile.
      scope: ["read:user", "user:email", "repo"]
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: { enabled: true, maxAge: 5 * 60 }
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail({ email, url });
      }
    })
  ]
});

export type AuthSession = typeof auth.$Infer.Session;
