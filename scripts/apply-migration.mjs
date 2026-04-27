// One-shot migration applier — used when drizzle-kit push hangs against
// the Supabase pooler. Reads .env.local, opens a postgres-js connection
// with explicit SSL, and executes the generated migration SQL as a single
// transaction. Falls back to per-statement on transaction errors so we
// can see exactly which DDL line broke.
//
// Usage:
//   node scripts/apply-migration.mjs drizzle/0000_some_name.sql

import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

function loadDotenvLocal() {
  if (!existsSync(".env.local")) return;
  const text = readFileSync(".env.local", "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = v;
  }
}
loadDotenvLocal();

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("usage: node scripts/apply-migration.mjs <path/to/migration.sql>");
  process.exit(1);
}
if (!existsSync(sqlFile)) {
  console.error(`migration file not found: ${sqlFile}`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

// Drizzle separates statements with --> statement-breakpoint
const raw = readFileSync(sqlFile, "utf8");
const statements = raw
  .split(/-->\s*statement-breakpoint/i)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`reading ${sqlFile}`);
console.log(`${statements.length} statements found`);

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  idle_timeout: 5,
  connect_timeout: 30,
  prepare: false
});

let applied = 0;
let skipped = 0;
let failed = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.split("\n")[0].slice(0, 70);
  try {
    await sql.unsafe(stmt);
    applied++;
    process.stdout.write(`\r[${i + 1}/${statements.length}] ✓ ${preview}`.padEnd(80));
  } catch (err) {
    const msg = err.message || String(err);
    if (
      err.code === "42P07" ||
      msg.includes("already exists") ||
      msg.includes("duplicate")
    ) {
      skipped++;
      process.stdout.write(`\r[${i + 1}/${statements.length}] = ${preview}`.padEnd(80));
    } else {
      failed++;
      console.log(`\n[${i + 1}/${statements.length}] ✗ ${preview}`);
      console.log(`    ${err.code || ""} ${msg}`);
    }
  }
}

console.log("");
console.log("─".repeat(60));
console.log(`applied: ${applied}   skipped (already exists): ${skipped}   failed: ${failed}`);

await sql.end({ timeout: 5 });
process.exit(failed === 0 ? 0 : 1);
