"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updatePreferencesAction,
  updateUsernameAction,
  type SettingsActionState
} from "./actions";
import { Button } from "@/components/ui/Button";
import type { UserSettings } from "@/db/repositories/users";

const initialState: SettingsActionState = {};

export function UsernameForm({ user }: { user: UserSettings }) {
  const [state, formAction] = useFormState(updateUsernameAction, initialState);
  const nextChange = user.usernameUpdatedAt
    ? new Date(user.usernameUpdatedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;
  const locked = nextChange ? Date.now() < nextChange.getTime() : false;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mono text-xs uppercase tracking-widest text-elf-muted" htmlFor="username">
          username
        </label>
        <input
          id="username"
          name="username"
          defaultValue={user.username ?? ""}
          placeholder="your_handle"
          disabled={locked}
          className="mt-2 w-full h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep disabled:opacity-60"
        />
        <p className="mt-2 text-xs text-elf-muted">
          Lowercase letters, numbers, and underscores. You can change it once every 30 days.
        </p>
        {locked && nextChange && (
          <p className="mt-2 text-xs text-elf-mid">
            Next username change opens {nextChange.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}.
          </p>
        )}
      </div>
      <ActionMessage state={state} field="username" />
      <Submit disabled={locked}>Save username</Submit>
    </form>
  );
}

export function PreferencesForm({ user }: { user: UserSettings }) {
  const [state, formAction] = useFormState(updatePreferencesAction, initialState);
  const selectedRoles = parseRoleProfile(user.roleProfile);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mono text-xs uppercase tracking-widest text-elf-muted" htmlFor="name">
          display name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={user.name}
          className="mt-2 w-full h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink focus:outline-none focus:border-elf-deep"
        />
      </div>

      <div>
        <p className="mono text-xs uppercase tracking-widest text-elf-muted mb-3">
          experience
        </p>
        <p className="mb-3 text-xs text-elf-muted">
          Pick one role, or combine two for a hybrid experience.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {roleOptions.map((role) => (
            <label key={role.value} className="border-hair rounded-card p-4 cursor-pointer">
              <input
                type="checkbox"
                name="roles"
                value={role.value}
                defaultChecked={selectedRoles.includes(role.value)}
                className="sr-only peer"
              />
              <span className="block text-sm text-elf-forest peer-checked:text-elf-deep">
                {role.label}
              </span>
              <span className="mt-1 block text-xs text-elf-muted leading-relaxed">
                {role.body}
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.roleProfile && (
          <p className="mt-3 text-sm text-red-700">{state.fieldErrors.roleProfile}</p>
        )}
      </div>

      <div>
        <p className="mono text-xs uppercase tracking-widest text-elf-muted mb-3">
          feature benefits
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="border-hair rounded-card p-4 cursor-pointer">
            <input
              type="radio"
              name="benefitOverride"
              value="standard"
              defaultChecked={user.benefitOverride !== "max"}
              className="sr-only peer"
            />
            <span className="block text-sm text-elf-forest peer-checked:text-elf-deep">
              Standard
            </span>
            <span className="mt-1 block text-xs text-elf-muted leading-relaxed">
              Follow normal workspace plan behavior when gating turns on.
            </span>
          </label>
          <label className="border-hair rounded-card p-4 cursor-pointer">
            <input
              type="radio"
              name="benefitOverride"
              value="max"
              defaultChecked={user.benefitOverride === "max"}
              className="sr-only peer"
            />
            <span className="block text-sm text-elf-forest peer-checked:text-elf-deep">
              Max demo access
            </span>
            <span className="mt-1 block text-xs text-elf-muted leading-relaxed">
              Treat this account as having every planned benefit unlocked.
            </span>
          </label>
        </div>
      </div>

      <ActionMessage state={state} />
      <Submit>Save preferences</Submit>
    </form>
  );
}

function Submit({
  children,
  disabled
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Saving..." : children}
    </Button>
  );
}

function ActionMessage({
  state,
  field
}: {
  state: SettingsActionState;
  field?: "username";
}) {
  const fieldError = field ? state.fieldErrors?.[field] : undefined;
  const error = fieldError ?? state.error;
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (state.ok) return <p className="text-sm text-elf-deep">{state.ok}</p>;
  return null;
}

const roleOptions = [
  {
    value: "dev",
    label: "Developer",
    body: "GitHub-first project shelves, commits, forks, Cowork, and repo sync."
  },
  {
    value: "writer",
    label: "Writer",
    body: "Plain-English commit context, content tasks, drafts, and project history."
  },
  {
    value: "designer",
    label: "Designer",
    body: "Project state, assets, launch context, and cross-functional handoffs."
  },
  {
    value: "product-manager",
    label: "Product manager",
    body: "Workspaces, permissions, forks, payments, audit logs, and team visibility."
  },
  {
    value: "manager",
    label: "Manager",
    body: "Approvals, governance, treasury, members, activity, and plan controls."
  },
] as const;

function parseRoleProfile(roleProfile: string) {
  if (!roleProfile || roleProfile === "viewer") return [];
  return roleProfile.split("+");
}
