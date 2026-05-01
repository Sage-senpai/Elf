import { Hono } from "hono";
import { z } from "zod";
import { requireUser } from "../middleware/auth";
import { requireWorkspace } from "../middleware/workspace";
import {
  acceptInvite,
  createInvite,
  findInviteByToken,
  listPendingInvites,
  listWorkspaceMembers,
  resolveInviteIdentifier,
  revokeInvite
} from "@/db/repositories/invites";
import { roleValues } from "@/db/schema/workspaces";
import { writeActivity } from "@/db/repositories/activity";

const InviteBody = z.object({
  identifier: z
    .string()
    .min(1, "Email or @username required")
    .max(120),
  role: z.enum(roleValues).refine((r) => r !== "manager" || true, {
    message: "Invalid role"
  })
});

/**
 * Workspace-scoped invite management. Manager-only.
 *
 * Mounted at /api/workspaces/:codename/invites.
 */
export const workspaceInvitesRouter = new Hono()
  .use("*", requireUser)
  .use("*", requireWorkspace)
  .get("/", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    const [pending, members] = await Promise.all([
      listPendingInvites(c.var.workspace.id),
      listWorkspaceMembers(c.var.workspace.id)
    ]);
    return c.json({ pending, members });
  })
  .post("/", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const parsed = InviteBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation", issues: parsed.error.issues }, 400);
    }

    const resolved = await resolveInviteIdentifier(parsed.data.identifier);
    if (!resolved) {
      return c.json(
        {
          error: "unknown_identifier",
          message:
            "We couldn't find that user. Use an email address or an existing @username."
        },
        404
      );
    }

    const invite = await createInvite({
      workspaceId: c.var.workspace.id,
      email: resolved.email,
      role: parsed.data.role,
      invitedBy: c.var.userId
    });

    void writeActivity({
      workspaceId: c.var.workspace.id,
      actorId: c.var.userId,
      type: "member.invited",
      payload: {
        email: resolved.email,
        role: parsed.data.role,
        matched_by: resolved.matchedBy
      }
    }).catch(() => {});

    const origin = new URL(c.req.url).origin;
    const link = `${origin}/invite/${invite.token}`;
    return c.json({ invite, link, matchedBy: resolved.matchedBy }, 201);
  })
  .delete("/:inviteId", async (c) => {
    if (c.var.workspaceRole !== "manager") {
      return c.json({ error: "forbidden" }, 403);
    }
    await revokeInvite(c.var.workspace.id, c.req.param("inviteId"));
    return c.json({ ok: true });
  });

/**
 * User-scoped invite acceptance.
 *
 * Mounted at /api/invites.
 *
 *   GET  /:token            Look up an invite (must be signed in)
 *   POST /:token/accept     Accept the invite — adds the user to the workspace
 */
export const userInvitesRouter = new Hono()
  .use("*", requireUser)
  .get("/:token", async (c) => {
    const invite = await findInviteByToken(c.req.param("token"));
    if (!invite) return c.json({ error: "not_found" }, 404);
    return c.json({
      invite: {
        email: invite.email,
        role: invite.role,
        workspaceCodename: invite.workspaceCodename,
        workspaceDisplayName: invite.workspaceDisplayName,
        inviterName: invite.inviterName,
        expiresAt: invite.expiresAt
      },
      forCurrentUser:
        invite.email.toLowerCase() === c.var.userEmail.toLowerCase()
    });
  })
  .post("/:token/accept", async (c) => {
    const invite = await findInviteByToken(c.req.param("token"));
    const result = await acceptInvite({
      token: c.req.param("token"),
      userId: c.var.userId,
      userEmail: c.var.userEmail
    });
    if (!result.ok) {
      const status =
        result.reason === "not_found"
          ? 404
          : result.reason === "wrong_user"
            ? 403
            : 409;
      return c.json({ error: result.reason }, status);
    }
    if (invite) {
      void writeActivity({
        workspaceId: invite.workspaceId,
        actorId: c.var.userId,
        type: "member.joined",
        payload: { email: invite.email, role: invite.role }
      }).catch(() => {});
    }
    return c.json({ ok: true, workspaceCodename: result.workspaceCodename });
  });
