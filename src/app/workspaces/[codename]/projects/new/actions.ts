"use server";

import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import {
  createProject,
  slugify,
  findProjectBySlug,
  SlugTakenError,
  type ProjectStatus
} from "@/db/repositories/projects";

const Input = z.object({
  name: z.string().min(1, "Project name is required").max(80),
  description: z.string().max(500).optional(),
  niche: z.string().max(40).optional(),
  status: z.enum(["active", "wip", "concept", "archived"]).default("concept"),
  githubRepo: z
    .string()
    .max(120)
    .regex(
      /^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)?$/,
      'Use the "owner/repo" form — e.g. "vercel/next.js" or "acme-studio/quiz-engine". Just the path, no https:// or github.com.'
    )
    .optional(),
  stack: z
    .string()
    .max(200)
    .optional()
    .transform((s) =>
      (s ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 20)
    )
});

export type CreateProjectState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"name" | "description" | "niche" | "githubRepo" | "stack", string>
  >;
};

export async function createProjectAction(
  codename: string,
  _prev: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const session = await requireSession();

  const workspace = await findWorkspaceByCodename(codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();
  // Viewers can't create projects.
  if (role === "viewer") {
    return { error: "Viewers can't create projects in this workspace." };
  }

  const parsed = Input.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    niche: String(formData.get("niche") ?? "").trim() || undefined,
    status: String(formData.get("status") ?? "concept"),
    githubRepo: String(formData.get("githubRepo") ?? "").trim() || undefined,
    stack: String(formData.get("stack") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    const fieldErrors: CreateProjectState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "name" ||
        key === "description" ||
        key === "niche" ||
        key === "githubRepo" ||
        key === "stack"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  // Slug pick: base on name, retry until free.
  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  for (let i = 1; i < 25; i++) {
    const existing = await findProjectBySlug(workspace.id, slug);
    if (!existing) break;
    slug = `${baseSlug}-${i + 1}`;
  }

  try {
    const project = await createProject({
      workspaceId: workspace.id,
      ownerId: session.user.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? null,
      niche: parsed.data.niche ?? null,
      status: parsed.data.status as ProjectStatus,
      stack: parsed.data.stack,
      githubRepo: parsed.data.githubRepo ?? null
    });
    redirect(`/workspaces/${workspace.codename}/projects/${project.slug}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    if (err instanceof SlugTakenError) {
      return { error: `Slug "${err.slug}" is already taken — try renaming the project.` };
    }
    return {
      error: err instanceof Error ? err.message : "Could not create project."
    };
  }
}
