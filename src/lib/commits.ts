import type { CommitType } from "@/db/schema/projects";

/**
 * Elf's 11-type commit taxonomy with display metadata.
 *
 * Source of truth for both the create form and any place we show a type
 * badge — keeps labels and tooltips consistent across the product.
 *
 * Order matches the picker's natural reading order: feature -> bug ->
 * non-code work -> housekeeping. Don't reorder by alphabet.
 */

export type CommitTypeMeta = {
  type: CommitType;
  label: string;
  hint: string;
  /** Short word used in card-style badges (e.g. activity feed). */
  badge: string;
};

export const commitTypeMeta: CommitTypeMeta[] = [
  {
    type: "feat",
    label: "feat",
    hint: "New functionality the user can see or use.",
    badge: "Feature"
  },
  {
    type: "fix",
    label: "fix",
    hint: "A bug fix — something that was broken now works.",
    badge: "Fix"
  },
  {
    type: "perf",
    label: "perf",
    hint: "Performance improvement with no behavior change.",
    badge: "Perf"
  },
  {
    type: "refactor",
    label: "refactor",
    hint: "Internal restructuring; same behavior, cleaner code.",
    badge: "Refactor"
  },
  {
    type: "content",
    label: "content",
    hint: "Copy, docs, decks, marketing — non-code contributions.",
    badge: "Content"
  },
  {
    type: "docs",
    label: "docs",
    hint: "Technical documentation: README, API docs, runbooks.",
    badge: "Docs"
  },
  {
    type: "audit",
    label: "audit",
    hint: "A reviewer's pass over existing work — what was checked and found.",
    badge: "Audit"
  },
  {
    type: "ref",
    label: "ref",
    hint: "Reference: linking external research, an article, a precedent.",
    badge: "Ref"
  },
  {
    type: "style",
    label: "style",
    hint: "Formatting only — whitespace, naming, no behavior change.",
    badge: "Style"
  },
  {
    type: "chore",
    label: "chore",
    hint: "Maintenance: deps, configs, build tooling.",
    badge: "Chore"
  },
  {
    type: "revert",
    label: "revert",
    hint: "Undoes a previous commit. Reference the reverted commit in the body.",
    badge: "Revert"
  }
];

const byType = new Map(commitTypeMeta.map((m) => [m.type, m]));

export function getCommitTypeMeta(type: string): CommitTypeMeta | undefined {
  return byType.get(type as CommitType);
}
