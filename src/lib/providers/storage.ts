/**
 * StorageProvider — abstracts file storage so route handlers never call
 * Supabase or 0G SDKs directly (per spec section 3, dev A constraints).
 *
 *  - SupabaseStorageProvider (default for attachments — instant, no cost)
 *  - ZeroGStorageProvider    (audit log + opt-in attachments — content-
 *                             addressable, gas cost per upload)
 *
 * 0G fallback: when ZG_PRIVATE_KEY is unset OR an upload fails, we return
 * a `mock_…` synthetic hash so the rest of the app keeps working — devs
 * without testnet funds still see audit entries land in the UI.
 */

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export type StorageProviderKind = "supabase" | "0g";

export interface StorageResult {
  ref: string;
  provider: StorageProviderKind;
  size: number;
  txHash?: string;
  gasUsed?: bigint;
  /** True when no private key was set OR the upload failed and we synthesized a hash. */
  mock?: boolean;
}

export interface StorageProvider {
  readonly kind: StorageProviderKind;
  upload(file: Buffer, mimeType: string, filename: string): Promise<StorageResult>;
  download(ref: string): Promise<Buffer>;
  getUrl(ref: string): Promise<string>;
  /** Returns null when the provider has no upfront cost (e.g. Supabase). */
  estimateCost(sizeBytes: number): Promise<{ display: string; wei: bigint } | null>;
}

class SupabaseStorageProvider implements StorageProvider {
  readonly kind = "supabase" as const;

  async upload(_file: Buffer, _mimeType: string, _filename: string): Promise<StorageResult> {
    throw new Error("SupabaseStorageProvider.upload not yet wired (sprint week 5).");
  }

  async download(_ref: string): Promise<Buffer> {
    throw new Error("SupabaseStorageProvider.download not yet wired.");
  }

  async getUrl(_ref: string): Promise<string> {
    throw new Error("SupabaseStorageProvider.getUrl not yet wired.");
  }

  async estimateCost(): Promise<null> {
    return null;
  }
}

class ZeroGStorageProvider implements StorageProvider {
  readonly kind = "0g" as const;

  /**
   * Upload a buffer to the 0G Storage Log. Returns the content-addressable
   * root hash + the on-chain tx hash.
   *
   * The 0G SDK doesn't expose a Buffer-input upload (only fromFilePath /
   * fromNodeFileHandle), so we round-trip through a tempfile in os.tmpdir.
   * Tempfile is removed in the finally block whether upload succeeds or fails.
   */
  async upload(file: Buffer, _mimeType: string, filename: string): Promise<StorageResult> {
    const privateKey = process.env.ZG_PRIVATE_KEY;
    const evmRpc = process.env.ZG_EVM_RPC;
    const indexerRpc = process.env.ZG_INDEXER_RPC;

    if (!privateKey || !evmRpc || !indexerRpc) {
      return mockResult(file.byteLength, "ZG_PRIVATE_KEY (or RPC) not set");
    }

    const tmpPath = join(
      tmpdir(),
      `zg-${randomBytes(6).toString("hex")}-${sanitize(filename)}`
    );
    await fs.writeFile(tmpPath, file);

    try {
      // Lazy imports — keeps the SDK out of the bundle for routes that
      // never write to 0G (most page renders).
      const { Indexer, ZgFile } = await import("@0glabs/0g-ts-sdk");
      const { ethers } = await import("ethers");

      const provider = new ethers.JsonRpcProvider(evmRpc);
      const signer = new ethers.Wallet(privateKey, provider);
      const indexer = new Indexer(indexerRpc);
      const zgFile = await ZgFile.fromFilePath(tmpPath);

      try {
        // The SDK's Signer type comes from its bundled commonjs ethers build;
        // ours comes from the ESM build. Same shape, different TS identity —
        // cast via unknown to bridge them. If indexer.upload's signature
        // ever changes, the Parameters<> generic catches it.
        const [res, err] = await indexer.upload(
          zgFile,
          evmRpc,
          signer as unknown as Parameters<typeof indexer.upload>[2]
        );
        if (err !== null) {
          // eslint-disable-next-line no-console
          console.warn("[0g] upload failed, falling back to mock:", err);
          return mockResult(file.byteLength, `0G upload failed: ${err}`);
        }
        return {
          ref: res.rootHash,
          provider: "0g",
          size: file.byteLength,
          txHash: res.txHash
        };
      } finally {
        await zgFile.close();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[0g] upload threw, falling back to mock:", err);
      return mockResult(
        file.byteLength,
        err instanceof Error ? err.message : "unknown 0G error"
      );
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }

  /**
   * Fetch a file by root hash. Mock refs (`mock_…`) throw — they were never
   * uploaded anywhere.
   */
  async download(ref: string): Promise<Buffer> {
    if (ref.startsWith("mock_")) {
      throw new Error(`Cannot download mock ref ${ref} — not anchored on-chain.`);
    }

    const indexerRpc = process.env.ZG_INDEXER_RPC;
    if (!indexerRpc) throw new Error("ZG_INDEXER_RPC not set.");

    const tmpPath = join(tmpdir(), `zg-dl-${randomBytes(6).toString("hex")}`);
    try {
      const { Indexer } = await import("@0glabs/0g-ts-sdk");
      const indexer = new Indexer(indexerRpc);
      const err = await indexer.download(ref, tmpPath, true);
      if (err !== null) throw new Error(`0G download failed: ${err}`);
      return await fs.readFile(tmpPath);
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }

  async getUrl(ref: string): Promise<string> {
    return `/api/storage/0g/${ref}`;
  }

  async estimateCost(sizeBytes: number): Promise<{ display: string; wei: bigint }> {
    // Rough estimate: 0G testnet currently ~1 ZG per MB.
    const mb = Math.max(1, Math.ceil(sizeBytes / (1024 * 1024)));
    return {
      display: `~${mb} ZG`,
      wei: BigInt(mb) * 10n ** 18n
    };
  }
}

function mockResult(size: number, _reason: string): StorageResult {
  return {
    ref: `mock_${randomBytes(16).toString("hex")}`,
    provider: "0g",
    size,
    mock: true
  };
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
}

export function getStorageProvider(kind: StorageProviderKind): StorageProvider {
  return kind === "0g" ? new ZeroGStorageProvider() : new SupabaseStorageProvider();
}

/** Direct accessor for the audit-log writer (always 0G, never the user's choice). */
export function getZeroGProvider(): StorageProvider {
  return new ZeroGStorageProvider();
}
