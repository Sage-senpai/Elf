"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createProjectAction,
  type CreateProjectState
} from "./actions";
import { Button } from "@/components/ui/Button";

const initialState: CreateProjectState = {};

type Draft = {
  name: string;
  description: string;
  niche: string;
  status: string;
  githubRepo: string;
  stack: string;
  savedAt: number;
};

const EMPTY_DRAFT: Omit<Draft, "savedAt"> = {
  name: "",
  description: "",
  niche: "",
  status: "concept",
  githubRepo: "",
  stack: ""
};

export function CreateProjectForm({ codename }: { codename: string }) {
  const action = createProjectAction.bind(null, codename);
  const [state, formAction] = useFormState(action, initialState);

  // Per-workspace draft key so users can switch workspaces without collision.
  const draftKey = `elf:project-draft:${codename}`;

  const [draft, setDraft] = useState<Omit<Draft, "savedAt">>(EMPTY_DRAFT);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const hydrated = useRef(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Draft;
        const hasContent =
          parsed.name || parsed.description || parsed.niche ||
          parsed.githubRepo || parsed.stack;
        if (hasContent) {
          setDraft({
            name: parsed.name ?? "",
            description: parsed.description ?? "",
            niche: parsed.niche ?? "",
            status: parsed.status ?? "concept",
            githubRepo: parsed.githubRepo ?? "",
            stack: parsed.stack ?? ""
          });
          setSavedAt(parsed.savedAt ?? null);
          setRestored(true);
        }
      }
    } catch {
      // Corrupt draft — ignore.
    }
    hydrated.current = true;
  }, [draftKey]);

  // Save draft on every change (debounced via setTimeout).
  useEffect(() => {
    if (!hydrated.current) return;
    const isEmpty =
      !draft.name && !draft.description && !draft.niche &&
      !draft.githubRepo && !draft.stack;
    if (isEmpty) {
      localStorage.removeItem(draftKey);
      setSavedAt(null);
      return;
    }
    const timer = setTimeout(() => {
      const now = Date.now();
      const payload: Draft = { ...draft, savedAt: now };
      try {
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setSavedAt(now);
      } catch {
        // Storage quota or disabled — silently skip.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, draftKey]);

  // After successful submit, server action redirects — never reaches here.
  // But if the redirect doesn't happen and there are no errors, drop draft.
  useEffect(() => {
    if (!state.error && !state.fieldErrors) return;
  }, [state]);

  const update = (field: keyof typeof EMPTY_DRAFT) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDraft((d) => ({ ...d, [field]: e.target.value }));
    };

  const clearDraft = () => {
    if (!confirm("Discard this draft?")) return;
    setDraft(EMPTY_DRAFT);
    localStorage.removeItem(draftKey);
    setSavedAt(null);
    setRestored(false);
  };

  return (
    <form
      action={(fd) => {
        // Server action submits; on success it redirects (draft becomes
        // moot). On failure we keep the draft. Clear on next mount only
        // if user explicitly wants to.
        formAction(fd);
      }}
      className="space-y-6"
    >
      {restored && (
        <div className="border-hair rounded-input p-3 bg-elf-warm-white text-sm flex items-start justify-between gap-3">
          <div>
            <p className="text-elf-forest">Draft restored</p>
            <p className="text-xs text-elf-muted mt-0.5">
              We brought back what you had before. Edit and submit when ready.
            </p>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="text-xs text-elf-muted underline shrink-0"
          >
            Discard
          </button>
        </div>
      )}

      <Field
        label="Project name"
        name="name"
        placeholder="Quiz scoring engine"
        hint="Shown across the workspace. URL slug auto-generates from this."
        error={state.fieldErrors?.name}
        required
        value={draft.name}
        onChange={update("name")}
      />

      <Textarea
        label="Description"
        name="description"
        placeholder="What is this project for? Who uses it?"
        hint="A line or two — content contributors and managers see this first."
        error={state.fieldErrors?.description}
        rows={3}
        value={draft.description}
        onChange={update("description")}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Field
          label="Niche"
          name="niche"
          placeholder="education, fintech, devtools…"
          hint="Helps you group projects later."
          error={state.fieldErrors?.niche}
          value={draft.niche}
          onChange={update("niche")}
        />
        <SelectField
          label="Status"
          name="status"
          value={draft.status}
          onChange={update("status")}
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
        hint='Format: "owner/repo" — e.g. "vercel/next.js". Just the path, not the full URL. Leave blank if you don&apos;t have one yet.'
        error={state.fieldErrors?.githubRepo}
        value={draft.githubRepo}
        onChange={update("githubRepo")}
      />

      <Field
        label="Stack"
        name="stack"
        placeholder="Next.js, Postgres, Tailwind"
        hint="Comma-separated. Up to 20 items."
        error={state.fieldErrors?.stack}
        value={draft.stack}
        onChange={update("stack")}
      />

      {state.error && (
        <p className="text-sm text-red-700 border-hair rounded-input p-3 bg-red-50">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <DraftStatus savedAt={savedAt} />
        <Submit />
      </div>
    </form>
  );
}

function DraftStatus({ savedAt }: { savedAt: number | null }) {
  if (!savedAt) return <span className="text-xs text-elf-muted">Not saved yet</span>;
  const diff = Date.now() - savedAt;
  const label = diff < 5_000 ? "Draft saved" : `Saved ${formatAgo(diff)} ago`;
  return <span className="text-xs text-elf-muted">{label} · stays here if you reload</span>;
}

function formatAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

function Field(props: {
  label: string;
  name: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
        value={props.value}
        onChange={props.onChange}
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
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="block">
      <Label label={props.label} optional={!props.required} />
      <textarea
        name={props.name}
        required={props.required}
        placeholder={props.placeholder}
        rows={props.rows ?? 3}
        value={props.value}
        onChange={props.onChange}
        className="mt-2 w-full px-4 py-3 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep resize-y"
      />
      <Hint hint={props.hint} error={props.error} />
    </label>
  );
}

function SelectField(props: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <Label label={props.label} />
      <select
        name={props.name}
        value={props.value}
        onChange={props.onChange}
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
    <Button size="lg" type="submit" disabled={pending}>
      {pending ? "Creating project…" : "Create project"}
    </Button>
  );
}
