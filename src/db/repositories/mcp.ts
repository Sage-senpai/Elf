import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { mcpApiKeys, type McpApiKey } from "@/db/schema/mcp";

/**
 * Repository for MCP API keys — the credentials external clients (Cursor,
 * Claude Desktop, custom integrations) use to talk to Elf's MCP server.
 *
 * Plaintext keys are *only* returned at creation time. We store SHA-256
 * hashes; the lookup path hashes the inbound bearer token and matches
 * against the stored hash so a database leak never exposes live keys.
 */

function hash(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export type CreateMcpKeyResult = {
  /** Stored row (no plaintext). */
  row: McpApiKey;
  /** The plaintext key — show ONCE on creation, then never again. */
  plaintext: string;
};

export async function createMcpKey(input: {
  workspaceId: string;
  userId: string;
  name: string;
}): Promise<CreateMcpKeyResult> {
  const plaintext = `elf_${randomBytes(24).toString("hex")}`;
  const [row] = await db
    .insert(mcpApiKeys)
    .values({
      workspaceId: input.workspaceId,
      userId: input.userId,
      name: input.name,
      keyHash: hash(plaintext)
    })
    .returning();
  return { row, plaintext };
}

export async function listMcpKeys(workspaceId: string): Promise<McpApiKey[]> {
  return db
    .select()
    .from(mcpApiKeys)
    .where(
      and(
        eq(mcpApiKeys.workspaceId, workspaceId),
        isNull(mcpApiKeys.revokedAt)
      )
    )
    .orderBy(desc(mcpApiKeys.createdAt));
}

export async function revokeMcpKey(
  workspaceId: string,
  keyId: string
): Promise<void> {
  await db
    .update(mcpApiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(mcpApiKeys.id, keyId), eq(mcpApiKeys.workspaceId, workspaceId))
    );
}

/**
 * Resolve a bearer token to an active key row. Returns null when the key
 * is unknown or has been revoked.
 */
export async function findActiveMcpKey(plaintext: string): Promise<McpApiKey | null> {
  const [row] = await db
    .select()
    .from(mcpApiKeys)
    .where(
      and(
        eq(mcpApiKeys.keyHash, hash(plaintext)),
        isNull(mcpApiKeys.revokedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function touchMcpKey(keyId: string): Promise<void> {
  await db
    .update(mcpApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(mcpApiKeys.id, keyId));
}
