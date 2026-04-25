"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { createWorkspace } from "@/db/repositories/workspaces";

const Input = z.object({
  displayName: z
    .string()
    .min(1, "Workspace name is required")
    .max(80, "Keep it under 80 characters"),
  githubOrg: z
    .string()
    .max(80)
    .regex(/^[A-Za-z0-9-]*$/, "Letters, digits, and hyphens only")
    .optional()
});

export type CreateWorkspaceState = {
  error?: string;
  fieldErrors?: Partial<Record<"displayName" | "githubOrg", string>>;
};

/**
 * Server action backing the new-workspace form. Validates with Zod, calls
 * the repository, then redirects to the workspace's dashboard at
 * /workspaces/<codename>. On failure returns a state object the form
 * renders inline.
 */
export async function createWorkspaceAction(
  _prev: CreateWorkspaceState,
  formData: FormData
): Promise<CreateWorkspaceState> {
  const session = await requireSession();

  const parsed = Input.safeParse({
    displayName: String(formData.get("displayName") ?? "").trim(),
    githubOrg: String(formData.get("githubOrg") ?? "").trim() || undefined
  });

  if (!parsed.success) {
    const fieldErrors: CreateWorkspaceState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "displayName" || key === "githubOrg") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    const workspace = await createWorkspace({
      ownerId: session.user.id,
      displayName: parsed.data.displayName,
      githubOrg: parsed.data.githubOrg ?? null
    });
    redirect(`/workspaces/${workspace.codename}`);
  } catch (err) {
    // redirect() throws a Next.js NEXT_REDIRECT — let it bubble.
    if (err && typeof err === "object" && "digest" in err) throw err;
    return {
      error: err instanceof Error ? err.message : "Could not create workspace."
    };
  }
}
