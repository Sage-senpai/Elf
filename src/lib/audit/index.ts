import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { zgAuditLog, type ZgAuditEntry } from "@/db/schema/zg";
import { getZeroGProvider } from "@/lib/providers/storage";

/**
 * Audit log — the spec-mandated tamper-evident chain (section 10, layer 2).
 *
 * Every important workspace event writes an entry: the JSON payload is
 * uploaded to 0G Storage Log (content-addressed, append-only), and a local
 * mirror is inserted into `zg_audit_log` for fast querying. The mirror
 * stores both the 0G root hash and the previous entry's hash so each
 * project's events form a chain.
 *
 * Fail-soft contract:
 *   - The 0G upload failing (no key, no funds, network issue) NEVER fails
 *     the calling business action. The local row is still inserted with a
 *     `mock_…` hash and the audit page surfaces that visually.
 *   - This is the spec rule from section 3 (Web3 architect): "Every on-chain
 *     action must have a clear fallback to the Web2 path."
 */

export type AuditEntryType =
  | "workspace_created"
  | "project_created"
  | "commit_created"
  | "fork_requested"
  | "fork_approved"
  | "fork_rejected"
  | "attachment_added"
  | "payment_created"
  | "payment_settled"
  | "agent_action";

export type WriteAuditInput = {
  workspaceId: string;
  projectId?: string | null;
  type: AuditEntryType;
  payload: Record<string, unknown>;
};

const provider = getZeroGProvider();

/**
 * Write one audit entry. Resolves with the local row.
 *
 * Safe to fire-and-forget from a server action — wrap in `void writeAuditEntry(...)`
 * if you don't want to block the response. The function never throws on
 * 0G failure; only an unrecoverable Postgres write would surface here.
 */
export async function writeAuditEntry(input: WriteAuditInput): Promise<ZgAuditEntry> {
  const previousHash = await getLatestHash(input.workspaceId, input.projectId ?? null);

  const envelope = {
    workspace_id: input.workspaceId,
    project_id: input.projectId ?? null,
    type: input.type,
    payload: input.payload,
    timestamp: new Date().toISOString(),
    previous_hash: previousHash
  };

  const buf = Buffer.from(JSON.stringify(envelope));
  const upload = await provider.upload(buf, "application/json", "audit.json");

  const [row] = await db
    .insert(zgAuditLog)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId ?? null,
      entryType: input.type,
      payload: envelope,
      zgRootHash: upload.ref,
      zgTxHash: upload.txHash ?? null,
      previousHash
    })
    .returning();

  return row;
}

/**
 * Latest entry hash for a project (or workspace if projectId is null).
 * Used as `previous_hash` on the next entry — forms the per-scope chain.
 */
async function getLatestHash(
  workspaceId: string,
  projectId: string | null
): Promise<string | null> {
  const rows = await db
    .select({ hash: zgAuditLog.zgRootHash })
    .from(zgAuditLog)
    .where(
      projectId
        ? and(
            eq(zgAuditLog.workspaceId, workspaceId),
            eq(zgAuditLog.projectId, projectId)
          )
        : eq(zgAuditLog.workspaceId, workspaceId)
    )
    .orderBy(desc(zgAuditLog.createdAt))
    .limit(1);
  return rows[0]?.hash ?? null;
}

/**
 * Read entries for a workspace, optionally filtered to one project.
 * Newest first — the audit-log UI scrolls back through history.
 */
export async function listAuditEntries(opts: {
  workspaceId: string;
  projectId?: string;
  limit?: number;
}): Promise<ZgAuditEntry[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const where = opts.projectId
    ? and(
        eq(zgAuditLog.workspaceId, opts.workspaceId),
        eq(zgAuditLog.projectId, opts.projectId)
      )
    : eq(zgAuditLog.workspaceId, opts.workspaceId);

  return db
    .select()
    .from(zgAuditLog)
    .where(where)
    .orderBy(desc(zgAuditLog.createdAt))
    .limit(limit);
}
