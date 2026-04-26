import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync
} from "node:crypto";

/**
 * AES-256-GCM symmetric encryption for stored secrets — treasury wallet
 * private keys, encrypted GitHub tokens, etc.
 *
 * Format:
 *   base64url(iv) + ":" + base64url(authTag) + ":" + base64url(ciphertext)
 *
 * Key derivation: scrypt over ENCRYPTION_KEY (any length string) with a
 * fixed app salt. This means rotating ENCRYPTION_KEY rotates every stored
 * ciphertext at once — for production we'd add a versioning header, but for
 * the hackathon a single key is enough.
 */

const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12; // GCM standard
const SALT = Buffer.from("elf-storage-v1", "utf8");

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ENCRYPTION_KEY must be set (>= 16 chars) before encrypting or decrypting."
    );
  }
  cachedKey = scryptSync(secret, SALT, KEY_LEN);
  return cachedKey;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [b64(iv), b64(tag), b64(ct)].join(":");
}

export function decryptSecret(blob: string): string {
  const [ivB64, tagB64, ctB64] = blob.split(":");
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("decryptSecret: malformed ciphertext");
  }
  const key = getKey();
  const decipher = createDecipheriv(ALGO, key, ub64(ivB64));
  decipher.setAuthTag(ub64(tagB64));
  const pt = Buffer.concat([
    decipher.update(ub64(ctB64)),
    decipher.final()
  ]);
  return pt.toString("utf8");
}

function b64(buf: Buffer): string {
  return buf.toString("base64url");
}
function ub64(s: string): Buffer {
  return Buffer.from(s, "base64url");
}
