import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  type User,
  type UserBenefitOverride,
  type UserRoleProfile
} from "@/db/schema/users";

export type UserSettings = Pick<
  User,
  | "id"
  | "name"
  | "email"
  | "image"
  | "username"
  | "usernameUpdatedAt"
  | "roleProfile"
  | "onboardingCompletedAt"
  | "benefitOverride"
>;

/**
 * Fetch displayable user records by id, returning a map keyed by id so
 * callers can look up authors O(1) when rendering a list of rows.
 */
export async function findUsersById(
  ids: string[]
): Promise<Record<string, { name: string; image: string | null }>> {
  if (ids.length === 0) return {};
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

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      username: users.username,
      usernameUpdatedAt: users.usernameUpdatedAt,
      roleProfile: users.roleProfile,
      onboardingCompletedAt: users.onboardingCompletedAt,
      benefitOverride: users.benefitOverride
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row ?? null;
}

export async function updateUserSettings(
  userId: string,
  input: {
    name?: string;
    roleProfile?: UserRoleProfile;
    benefitOverride?: UserBenefitOverride;
    onboardingCompletedAt?: Date | null;
  }
): Promise<UserSettings> {
  const [updated] = await db
    .update(users)
    .set({
      ...input,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      username: users.username,
      usernameUpdatedAt: users.usernameUpdatedAt,
      roleProfile: users.roleProfile,
      onboardingCompletedAt: users.onboardingCompletedAt,
      benefitOverride: users.benefitOverride
    });

  return updated;
}

export async function updateUsername(
  userId: string,
  username: string
): Promise<UserSettings> {
  const [updated] = await db
    .update(users)
    .set({
      username,
      usernameUpdatedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      username: users.username,
      usernameUpdatedAt: users.usernameUpdatedAt,
      roleProfile: users.roleProfile,
      onboardingCompletedAt: users.onboardingCompletedAt,
      benefitOverride: users.benefitOverride
    });

  return updated;
}
