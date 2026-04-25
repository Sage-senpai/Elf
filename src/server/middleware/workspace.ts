import type { MiddlewareHandler } from "hono";
import {
  findWorkspaceByCodename,
  getUserRole,
  type Workspace
} from "@/db/repositories/workspaces";
import type { Role } from "@/db/schema/workspaces";

declare module "hono" {
  interface ContextVariableMap {
    workspace: Workspace;
    workspaceRole: Role;
  }
}

/**
 * Resolves :codename from the route, loads the workspace, and verifies the
 * caller is a member. Compose AFTER requireUser so c.var.userId is set.
 *
 * 404 (not 403) when the user isn't a member — never leak the existence of
 * a workspace they don't belong to.
 */
export const requireWorkspace: MiddlewareHandler = async (c, next) => {
  const codename = c.req.param("codename");
  if (!codename) return c.json({ error: "missing_codename" }, 400);

  const workspace = await findWorkspaceByCodename(codename);
  if (!workspace) return c.json({ error: "not_found" }, 404);

  const role = await getUserRole(workspace.id, c.var.userId);
  if (!role) return c.json({ error: "not_found" }, 404);

  c.set("workspace", workspace);
  c.set("workspaceRole", role);
  await next();
};
