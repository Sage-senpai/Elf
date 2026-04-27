import { existsSync, readFileSync } from "node:fs";
import type { Config } from "drizzle-kit";

// drizzle-kit doesn't auto-load .env.local the way Next.js does, so we
// hand-parse it here. Tiny shim — only fires when the var isn't already
// set in the shell. Production CI sets DATABASE_URL directly.
loadDotenvLocal();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (Supabase Session pooler URI)."
  );
}

// Supabase requires SSL for pooler + direct connections. The url-string
// form of postgres-js doesn't negotiate it automatically here, so append
// ?sslmode=require if the user didn't already set it.
const baseUrl = (process.env.DIRECT_URL ?? process.env.DATABASE_URL)!;
const dbUrl = baseUrl.includes("sslmode=")
  ? baseUrl
  : baseUrl + (baseUrl.includes("?") ? "&" : "?") + "sslmode=require";

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: dbUrl, ssl: "require" },
  strict: true,
  verbose: true
} satisfies Config;

function loadDotenvLocal() {
  if (!existsSync(".env.local")) return;
  const text = readFileSync(".env.local", "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
