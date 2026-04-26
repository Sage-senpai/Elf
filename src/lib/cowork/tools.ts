import "server-only";
import type { InferenceTool } from "@/lib/providers/inference";
import { findProjectBySlug, listProjects } from "@/db/repositories/projects";
import { listProjectCommits } from "@/db/repositories/commits";
import { listWorkspaceActivity } from "@/db/repositories/activity";
import { listAuditEntries } from "@/lib/audit";
import { findUsersById } from "@/db/repositories/users";

/**
 * Live-data tools Claude can call inside Cowork. Implements the spec's
 * hallucination-resistant pattern (section 10, layer 1):
 *
 *   We DON'T stuff the project manifest into the system prompt.
 *   Claude calls these tools when it actually needs the data.
 *
 * Tools are scoped to one workspace + project context — they're built
 * fresh per-request inside the chat route so handlers close over the
 * scope of the caller (no cross-tenant leak risk).
 */

export type ToolContext = {
  workspaceId: string;
  workspaceCodename: string;
  projectId: string;
  projectSlug: string;
};

export function buildCoworkTools(ctx: ToolContext): InferenceTool[] {
  return [
    {
      name: "elf_get_project",
      description:
        "Fetch this project's current name, description, status, niche, " +
        "stack, GitHub link, and creation date. Use before answering any " +
        "question about what the project is or its current state.",
      input_schema: { type: "object", properties: {} },
      handler: async () => {
        const project = await findProjectBySlug(ctx.workspaceId, ctx.projectSlug);
        if (!project) throw new Error("Project not found.");
        return {
          name: project.name,
          slug: project.slug,
          description: project.description,
          niche: project.niche,
          status: project.status,
          stack: project.stack,
          tags: project.tags,
          github_repo: project.githubRepo,
          preview_url: project.previewUrl,
          created_at: project.createdAt
        };
      }
    },
    {
      name: "elf_list_commits",
      description:
        "List the most recent commits on this project. Each commit includes " +
        "type (feat / fix / content / audit / etc.), scope, summary, body, " +
        "author, breaking flag, and timestamp. Use to answer 'what changed' " +
        "or 'what's been happening' questions instead of guessing.",
      input_schema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Max commits to return. Default 10, max 50."
          }
        }
      },
      handler: async (args) => {
        const limit = Math.min(Number(args.limit ?? 10) || 10, 50);
        const commits = await listProjectCommits(ctx.projectId, limit);
        const authors = await findUsersById(commits.map((c) => c.authorId));
        return commits.map((c) => ({
          type: c.type,
          scope: c.scope,
          summary: c.summary,
          body: c.body,
          author: authors[c.authorId]?.name ?? null,
          is_breaking: c.isBreaking,
          created_at: c.createdAt
        }));
      }
    },
    {
      name: "elf_get_activity",
      description:
        "Workspace-wide activity feed in chronological order (newest " +
        "first). Includes project creations, commits, member joins, and " +
        "more. Useful for answering 'what's the team working on' across " +
        "all projects in this workspace, not just the current one.",
      input_schema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max events. Default 20, max 50." }
        }
      },
      handler: async (args) => {
        const limit = Math.min(Number(args.limit ?? 20) || 20, 50);
        const events = await listWorkspaceActivity(ctx.workspaceId, limit);
        return events.map((e) => ({
          type: e.type,
          payload: e.payload,
          created_at: e.createdAt
        }));
      }
    },
    {
      name: "elf_list_workspace_projects",
      description:
        "List every project in this workspace (not just the current one). " +
        "Useful when the user asks about other projects in their shelf.",
      input_schema: { type: "object", properties: {} },
      handler: async () => {
        const projects = await listProjects(ctx.workspaceId);
        return projects.map((p) => ({
          name: p.name,
          slug: p.slug,
          status: p.status,
          niche: p.niche,
          description: p.description
        }));
      }
    },
    {
      name: "elf_get_audit_log",
      description:
        "Read the immutable, content-addressed audit log for this " +
        "project. Each entry includes the event type, payload, the on-chain " +
        "root hash, and the previous entry's hash (forming a tamper-evident " +
        "chain). Use when the user asks about historical record or proof.",
      input_schema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max entries. Default 20, max 50." }
        }
      },
      handler: async (args) => {
        const limit = Math.min(Number(args.limit ?? 20) || 20, 50);
        const entries = await listAuditEntries({
          workspaceId: ctx.workspaceId,
          projectId: ctx.projectId,
          limit
        });
        return entries.map((e) => ({
          type: e.entryType,
          payload: e.payload,
          root_hash: e.zgRootHash,
          tx_hash: e.zgTxHash,
          previous_hash: e.previousHash,
          created_at: e.createdAt,
          anchored: !e.zgRootHash.startsWith("mock_")
        }));
      }
    }
  ];
}

/**
 * The minimal Cowork system prompt. Notice what's NOT here: project name,
 * stack, recent commits, member list. Claude must call elf_get_project /
 * elf_list_commits / etc. to learn those.
 */
export function buildCoworkSystemPrompt(input: {
  role: "manager" | "dev" | "content" | "viewer";
  workspaceCodename: string;
  projectSlug: string;
  userName: string;
}): string {
  const roleGuide =
    input.role === "content"
      ? "The user is a content contributor — avoid raw git terminology unless they ask for it. Prefer plain language."
      : input.role === "dev"
        ? "The user is a developer — technical terms are welcome and they appreciate precision."
        : input.role === "manager"
          ? "The user is a workspace manager — they care about progress, blockers, contributor activity, and approvals."
          : "The user is a viewer — they can read but not edit. Frame answers as observations, not action items.";

  return `You are an embedded collaborator inside the Elf workspace "${input.workspaceCodename}", helping ${input.userName} on the project "${input.projectSlug}".

${roleGuide}

You have these tools to fetch live, verified workspace data:
  - elf_get_project — current project state
  - elf_list_commits — recent commits with types and authors
  - elf_get_activity — workspace-wide event feed
  - elf_list_workspace_projects — sibling projects in this workspace
  - elf_get_audit_log — tamper-proof historical record

CRITICAL: never invent project facts, commit history, contributor names, or status. If you're about to make a claim about the project, call the relevant tool first. If the user asks "what's been happening", start with elf_list_commits or elf_get_activity. Be terse — most answers are 1-3 sentences.`;
}
