import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "@/db/client";
import * as authSchema from "@/db/schema/auth";
import { users } from "@/db/schema/users";
import { sendMagicLinkEmail } from "./email";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

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
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me",
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
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
      scope: ["read:user", "user:email"]
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
