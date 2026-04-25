"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createWorkspaceAction,
  type CreateWorkspaceState
} from "./actions";
import { Button } from "@/components/ui/Button";

const initialState: CreateWorkspaceState = {};

export function CreateWorkspaceForm() {
  const [state, formAction] = useFormState(createWorkspaceAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Field
        label="Workspace name"
        name="displayName"
        placeholder="Acme Studio"
        hint="Shown in the sidebar and on invites. You can rename it later."
        error={state.fieldErrors?.displayName}
        required
      />
      <Field
        label="GitHub organization"
        name="githubOrg"
        placeholder="acme-studio"
        hint="Optional — link an org now to fast-track repo permissions later."
        error={state.fieldErrors?.githubOrg}
      />

      {state.error && (
        <p className="text-sm text-red-700 border-hair rounded-input p-3 bg-red-50">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}

function Field(props: {
  label: string;
  name: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mono text-xs uppercase tracking-widest text-elf-muted">
        {props.label}
        {!props.required && <span className="ml-2 normal-case">(optional)</span>}
      </span>
      <input
        name={props.name}
        type="text"
        required={props.required}
        placeholder={props.placeholder}
        autoComplete="off"
        className="mt-2 w-full h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
      />
      {props.hint && !props.error && (
        <span className="mt-1.5 block text-xs text-elf-muted">{props.hint}</span>
      )}
      {props.error && (
        <span className="mt-1.5 block text-xs text-red-700">{props.error}</span>
      )}
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button size="lg" type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating workspace…" : "Create workspace"}
    </Button>
  );
}
