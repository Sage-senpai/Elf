import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __elfPg: ReturnType<typeof postgres> | undefined;
}

function makeClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Don't crash at import time — landing page renders fine without a DB.
    // Routes that touch the DB will throw when they actually call db.
    return null;
  }
  return postgres(url, { prepare: false, max: 10 });
}

const client = global.__elfPg ?? makeClient();
if (process.env.NODE_ENV !== "production") {
  global.__elfPg = client ?? undefined;
}

export const db = client
  ? drizzle(client, { schema })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(
            "DATABASE_URL is not set. Add it to .env.local before calling the database."
          );
        }
      }
    ) as ReturnType<typeof drizzle<typeof schema>>);

export { schema };
