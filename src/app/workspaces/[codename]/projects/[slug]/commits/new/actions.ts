"use server";

import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { findProjectBySlug } from "@/db/repositories/projects";
import { createCommit } from "@/db/repositories/commits";
import { commitTypeValues, type CommitType } from "@/db/schema/projects";

const Input = z.object({
  type: z.enum(commitTypeValues),
  scope: z.string().max(40).optional(),
  summary: z.string().min(1, "Summary is required").max(72, "Keep under 72 characters"),
  body: z.string().max(2000).optional(),
  isBreaking: z.string().optional() // form sends "on" when checked, undefined when not
});

export type CreateCommitState = {
  error?: string;
  fieldErrors?: Partial<Record<"type" | "scope" | "summary" | "body", string>>;
};

export async function createCommitAction(
  codename: string,
  slug: string,
  _prev: CreateCommitState,
  formData: FormData
): Promise<CreateCommitState> {
  const session = await requireSession();

  const workspace = await findWorkspaceByCodename(codename);
  if (!workspace) notFound();
  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();
  if (role === "viewer") {
    return { error: "Viewers can't author commits in this workspace." };
  }

  const project = await findProjectBySlug(workspace.id, slug);
  if (!project) notFound();

  const parsed = Input.safeParse({
    type: String(formData.get("type") ?? ""),
    scope: String(formData.get("scope") ?? "").trim() || undefined,
    summary: String(formData.get("summary") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim() || undefined,
    isBreaking: formData.get("isBreaking") ? "on" : undefined
  });

  if (!parsed.success) {
    const fieldErrors: CreateCommitState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "type" || key === "scope" || key === "summary" || key === "body") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    await createCommit({
      workspaceId: workspace.id,
      projectId: project.id,
      authorId: session.user.id,
      type: parsed.data.type as CommitType,
      summary: parsed.data.summary,
      scope: parsed.data.scope ?? null,
      body: parsed.data.body ?? null,
      isBreaking: !!parsed.data.isBreaking
    });
    redirect(`/workspaces/${codename}/projects/${slug}`);
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: err instanceof Error ? err.message : "Could not create commit."
    };
  }
}
