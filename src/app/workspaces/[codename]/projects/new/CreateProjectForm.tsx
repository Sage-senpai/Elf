"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  createProjectAction,
  type CreateProjectState
} from "./actions";
import { Button } from "@/components/ui/Button";

const initialState: CreateProjectState = {};

export function CreateProjectForm({ codename }: { codename: string }) {
  const action = createProjectAction.bind(null, codename);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Field
        label="Project name"
        name="name"
        placeholder="Quiz scoring engine"
        hint="Shown across the workspace. URL slug auto-generates from this."
        error={state.fieldErrors?.name}
        required
      />

      <Textarea
        label="Description"
        name="description"
        placeholder="What is this project for? Who uses it?"
        hint="A line or two — content contributors and managers see this first."
        error={state.fieldErrors?.description}
        rows={3}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="Niche"
          name="niche"
          placeholder="education, fintech, devtools…"
          hint="Helps you group projects later."
          error={state.fieldErrors?.niche}
        />
        <SelectField
          label="Status"
          name="status"
          options={[
            { value: "concept", label: "Concept" },
            { value: "wip", label: "Work in progress" },
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" }
          ]}
        />
      </div>

      <Field
        label="GitHub repo"
        name="githubRepo"
        placeholder="acme-studio/quiz-engine"
        hint='Format: "owner/repo". You can link this later if you don&apos;t have one yet.'
        error={state.fieldErrors?.githubRepo}
      />

      <Field
        label="Stack"
        name="stack"
        placeholder="Next.js, Postgres, Tailwind"
        hint="Comma-separated. Up to 20 items."
        error={state.fieldErrors?.stack}
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
      <Label label={props.label} optional={!props.required} />
      <input
        name={props.name}
        type="text"
        required={props.required}
        placeholder={props.placeholder}
        autoComplete="off"
        className="mt-2 w-full h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep"
      />
      <Hint hint={props.hint} error={props.error} />
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
  required?: boolean;
}) {
  return (
    <label className="block">
      <Label label={props.label} optional={!props.required} />
      <textarea
        name={props.name}
        required={props.required}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        className="mt-2 w-full px-4 py-3 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep resize-y"
      />
      <Hint hint={props.hint} error={props.error} />
    </label>
  );
}

function SelectField(props: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <Label label={props.label} />
      <select
        name={props.name}
        defaultValue="concept"
        className="mt-2 w-full h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink focus:outline-none focus:border-elf-deep"
      >
        {props.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Label({ label, optional }: { label: string; optional?: boolean }) {
  return (
    <span className="mono text-xs uppercase tracking-widest text-elf-muted">
      {label}
      {optional && <span className="ml-2 normal-case">(optional)</span>}
    </span>
  );
}

function Hint({ hint, error }: { hint?: string; error?: string }) {
  if (error) return <span className="mt-1.5 block text-xs text-red-700">{error}</span>;
  if (hint) return <span className="mt-1.5 block text-xs text-elf-muted">{hint}</span>;
  return null;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button size="lg" type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating project…" : "Create project"}
    </Button>
  );
}
