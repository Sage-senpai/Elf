"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  getUserSettings,
  updateUsername,
  updateUserSettings
} from "@/db/repositories/users";
import {
  userBenefitOverrideValues,
  userRoleValues,
  type UserBenefitOverride,
  type UserRoleProfile
} from "@/db/schema/users";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const UsernameInput = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use at least 3 characters")
    .max(30, "Keep it under 30 characters")
    .regex(/^[a-z0-9][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores")
});

const PreferencesInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Keep it under 80 characters"),
  benefitOverride: z.enum(userBenefitOverrideValues)
});

export type SettingsActionState = {
  ok?: string;
  error?: string;
  fieldErrors?: Partial<Record<"username" | "name" | "roleProfile" | "benefitOverride", string>>;
};

function parseRoleProfile(formData: FormData): UserRoleProfile | null {
  const roleSet = new Set<string>(userRoleValues);
  const roles = formData
    .getAll("roles")
    .map((role) => String(role))
    .filter((role): role is (typeof userRoleValues)[number] => roleSet.has(role));
  const uniqueRoles = Array.from(new Set(roles));

  if (uniqueRoles.length === 0) return "viewer";
  if (uniqueRoles.length > 2) return null;
  return uniqueRoles.join("+");
}

export async function updateUsernameAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const session = await requireSession();
  const parsed = UsernameInput.safeParse({
    username: String(formData.get("username") ?? "")
  });

  if (!parsed.success) {
    return { fieldErrors: { username: parsed.error.issues[0]?.message } };
  }

  const settings = await getUserSettings(session.user.id);
  if (!settings) return { error: "Could not load your account." };

  if (settings.usernameUpdatedAt) {
    const nextChangeAt = settings.usernameUpdatedAt.getTime() + THIRTY_DAYS_MS;
    if (Date.now() < nextChangeAt && parsed.data.username !== settings.username) {
      return {
        error: `Usernames can only be changed every 30 days. Next change: ${new Date(
          nextChangeAt
        ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.`
      };
    }
  }

  try {
    await updateUsername(session.user.id, parsed.data.username);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("users_username_unique")) {
      return { fieldErrors: { username: "That username is already taken." } };
    }
    return { error: "Could not update username." };
  }

  revalidatePath("/settings");
  revalidatePath("/onboarding");
  return { ok: "Username updated." };
}

export async function updatePreferencesAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const session = await requireSession();
  const parsed = PreferencesInput.safeParse({
    name: String(formData.get("name") ?? ""),
    benefitOverride: String(formData.get("benefitOverride") ?? "standard")
  });
  const roleProfile = parseRoleProfile(formData);

  if (!parsed.success) {
    const fieldErrors: SettingsActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "name" ||
        key === "roleProfile" ||
        key === "benefitOverride"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }
  if (!roleProfile) {
    return { fieldErrors: { roleProfile: "Choose one role, or combine two roles." } };
  }

  await updateUserSettings(session.user.id, {
    name: parsed.data.name,
    roleProfile,
    benefitOverride: parsed.data.benefitOverride as UserBenefitOverride
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: "Preferences saved." };
}

export async function completeOnboardingAction(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const session = await requireSession();
  const roleProfile = parseRoleProfile(formData);

  if (!roleProfile) {
    return { fieldErrors: { roleProfile: "Choose one role, or combine two roles." } };
  }

  await updateUserSettings(session.user.id, {
    roleProfile,
    onboardingCompletedAt: new Date()
  });

  revalidatePath("/onboarding");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: "Onboarding saved. Your workspace now has a better starting point." };
}
