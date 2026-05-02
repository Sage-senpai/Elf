"use client";

import { useFormState, useFormStatus } from "react-dom";
import { completeOnboardingAction, type SettingsActionState } from "@/app/settings/actions";
import { Button } from "@/components/ui/Button";
import type { UserSettings } from "@/db/repositories/users";

const initialState: SettingsActionState = {};

export function OnboardingForm({ user }: { user: UserSettings }) {
  const [state, formAction] = useFormState(completeOnboardingAction, initialState);
  const selectedRoles = parseRoleProfile(user.roleProfile);

  return (
    <form action={formAction} className="space-y-6">
      <p className="text-sm text-elf-muted">
        Pick one role, or combine two if you move between functions.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => (
          <label key={role.value} className="border-hair rounded-card p-4 sm:p-5 cursor-pointer">
            <input
              type="checkbox"
              name="roles"
              value={role.value}
              defaultChecked={selectedRoles.includes(role.value)}
              className="sr-only peer"
            />
            <span className="block text-lg text-elf-forest peer-checked:text-elf-deep">
              {role.label}
            </span>
            <span className="mt-2 block text-sm text-elf-muted leading-relaxed">
              {role.body}
            </span>
            <span className="mt-4 block mono text-xs uppercase tracking-widest text-elf-mid">
              {role.path}
            </span>
          </label>
        ))}
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.fieldErrors?.roleProfile && (
        <p className="text-sm text-red-700">{state.fieldErrors.roleProfile}</p>
      )}
      {state.ok && <p className="text-sm text-elf-deep">{state.ok}</p>}

      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving..." : "Use this experience"}
    </Button>
  );
}

const roles = [
  {
    value: "dev",
    label: "Developer",
    body: "Start with repositories, commits, fork requests, and Cowork sessions.",
    path: "GitHub -> project shelf -> fork flow"
  },
  {
    value: "writer",
    label: "Writer",
    body: "Focus on plain-English commit history, content tasks, and launch context.",
    path: "changes -> meaning -> content"
  },
  {
    value: "designer",
    label: "Designer",
    body: "Track project state, assets, implementation context, and handoff moments.",
    path: "state -> assets -> handoff"
  },
  {
    value: "product-manager",
    label: "Product manager",
    body: "See permissions, approvals, fork requests, plans, treasury, and audit signals.",
    path: "visibility -> decisions -> execution"
  },
  {
    value: "manager",
    label: "Manager",
    body: "Lead workspaces with member roles, approval gates, activity, and payments.",
    path: "team -> gates -> treasury"
  }
] as const;

function parseRoleProfile(roleProfile: string) {
  if (!roleProfile || roleProfile === "viewer") return [];
  return roleProfile.split("+");
}
