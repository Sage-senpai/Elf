/**
 * StorageProvider — abstracts file storage so route handlers never call
 * Supabase or 0G SDKs directly (per spec section 3, dev A constraints).
 *
 * Real impls live alongside this file:
 *  - SupabaseStorageProvider (default, instant)
 *  - ZeroGStorageProvider    (opt-in, gas cost per upload)
 *
 * Factory at the bottom reads workspace.storageProvider from the DB.
 */

export type StorageProviderKind = "supabase" | "0g";

export interface StorageResult {
  ref: string;
  provider: StorageProviderKind;
  size: number;
  txHash?: string;
  gasUsed?: bigint;
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

  async upload(_file: Buffer, _mimeType: string, _filename: string): Promise<StorageResult> {
    // TODO: import { Indexer, ZgFile } from '@0glabs/0g-ts-sdk'
    //       const zgFile = await ZgFile.fromBuffer(file, filename, mimeType)
    //       const [tree] = await zgFile.merkleTree()
    //       const [tx] = await indexer.upload(zgFile, ZG_EVM_RPC, signer)
    throw new Error("ZeroGStorageProvider.upload not yet wired (sprint week 3).");
  }

  async download(_ref: string): Promise<Buffer> {
    throw new Error("ZeroGStorageProvider.download not yet wired.");
  }

  async getUrl(ref: string): Promise<string> {
    return `/api/storage/0g/${ref}`;
  }

  async estimateCost(sizeBytes: number): Promise<{ display: string; wei: bigint }> {
    // Rough estimate: 0G testnet currently ~1 ZG per MB. Replace with live RPC quote.
    const mb = Math.max(1, Math.ceil(sizeBytes / (1024 * 1024)));
    return {
      display: `~${mb} ZG`,
      wei: BigInt(mb) * 10n ** 18n
    };
  }
}

export function getStorageProvider(kind: StorageProviderKind): StorageProvider {
  return kind === "0g" ? new ZeroGStorageProvider() : new SupabaseStorageProvider();
}
