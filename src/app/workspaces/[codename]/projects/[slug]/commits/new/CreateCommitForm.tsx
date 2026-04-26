"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { commitTypeMeta } from "@/lib/commits";
import {
  createCommitAction,
  type CreateCommitState
} from "./actions";

const initialState: CreateCommitState = {};

export function CreateCommitForm({
  codename,
  slug
}: {
  codename: string;
  slug: string;
}) {
  const action = createCommitAction.bind(null, codename, slug);
  const [state, formAction] = useFormState(action, initialState);
  const [type, setType] = useState<string>("feat");

  const selected = commitTypeMeta.find((m) => m.type === type);

  return (
    <form action={formAction} className="space-y-6">
      {/* Type picker — radio grid so the user sees all 11 with hints */}
      <div>
        <p className="mono text-xs uppercase tracking-widest text-elf-muted mb-3">
          Type
        </p>
        <div className="grid gap-2 grid-cols-3 md:grid-cols-4">
          {commitTypeMeta.map((meta) => {
            const checked = type === meta.type;
            return (
              <label
                key={meta.type}
                className={`cursor-pointer border-hair rounded-input px-3 py-2.5 text-center transition-colors ${
                  checked
                    ? "bg-elf-deep text-elf-warm-white border-elf-deep"
                    : "bg-elf-warm-white text-elf-ink hover:border-elf-deep"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={meta.type}
                  checked={checked}
                  onChange={() => setType(meta.type)}
                  className="sr-only"
                />
                <span className="mono text-xs">{meta.label}</span>
              </label>
            );
          })}
        </div>
        {selected && (
          <p className="mt-2.5 text-xs text-elf-muted">{selected.hint}</p>
        )}
        {state.fieldErrors?.type && (
          <p className="mt-2.5 text-xs text-red-700">{state.fieldErrors.type}</p>
        )}
      </div>

      <Field
        label="Scope"
        name="scope"
        placeholder="auth/github, db/schema, content/onboarding"
        hint="Optional. Names the area of the project this affects."
        error={state.fieldErrors?.scope}
      />

      <Field
        label="Summary"
        name="summary"
        placeholder="GitHub OAuth sign-in lands."
        hint="One imperative line, 72 characters max. Speaks to humans, not just devs."
        error={state.fieldErrors?.summary}
        maxLength={72}
        required
      />

      <Textarea
        label="Body"
        name="body"
        placeholder="Why this matters and what it changes for whoever's reading. Plain English — content contributors see this."
        hint="Optional. Markdown is fine; line breaks preserved."
        error={state.fieldErrors?.body}
        rows={5}
      />

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="isBreaking"
          className="mt-1 accent-elf-deep"
        />
        <span>
          <span className="text-sm text-elf-ink">Breaking change</span>
          <span className="block text-xs text-elf-muted mt-0.5">
            Tick this if anyone using this project will need to update their
            code or workflow because of this commit.
          </span>
        </span>
      </label>

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
  maxLength?: number;
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
        maxLength={props.maxLength}
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

function Textarea(props: {
  label: string;
  name: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mono text-xs uppercase tracking-widest text-elf-muted">
        {props.label} <span className="normal-case">(optional)</span>
      </span>
      <textarea
        name={props.name}
        rows={props.rows ?? 4}
        placeholder={props.placeholder}
        className="mt-2 w-full px-4 py-3 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep resize-y"
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
      {pending ? "Recording commit…" : "Record commit"}
    </Button>
  );
}
