import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";

/**
 * Fetch displayable user records by id, returning a map keyed by id so
 * callers can look up authors O(1) when rendering a list of rows.
 *
 * Skips the query when the input is empty so a project with zero
 * commits never round-trips the DB.
 */
export async function findUsersById(
  ids: string[]
): Promise<Record<string, { name: string; image: string | null }>> {
  if (ids.length === 0) return {};
  // De-dup
  const unique = Array.from(new Set(ids));

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image
    })
    .from(users)
    .where(inArray(users.id, unique));

  return Object.fromEntries(rows.map((r) => [r.id, { name: r.name, image: r.image }]));
}
