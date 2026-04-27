/**
 * Encryption-at-rest for media (audio, photos).
 *
 * Strategy (per spec docs/architecture.md §9):
 *   - Each media object gets its own 256-bit AES-GCM key (per-content key).
 *   - The per-content key is wrapped (encrypted) with the master ENCRYPTION_KEY.
 *   - The wrapped key + IV + auth tag are persisted in the media row's metadata.
 *   - The ciphertext lives in S3 (private bucket).
 *
 * Why per-content keys: revoking access to a single audio doesn't require
 * rotating the master. Audit log of which keys were touched can be precise.
 *
 * Note: AES-GCM is authenticated; tampered ciphertext fails decryption rather
 * than producing garbage.
 */
import { createCipheriv, createDecipheriv, randomBytes, type CipherGCM, type DecipherGCM } from 'node:crypto';
import { config } from '../../config/index.js';

const MASTER_KEY = Buffer.from(config.encryptionKey, 'hex').length === 32
  ? Buffer.from(config.encryptionKey, 'hex')
  : Buffer.from(config.encryptionKey, 'utf-8').subarray(0, 32);

if (MASTER_KEY.length !== 32) {
  // Pad/truncate defensively but warn — config validation should already require min 32 chars
  // (it does — see config/index.ts). This is paranoia.
  // eslint-disable-next-line no-console
  console.warn('encryptionKey is not 32 bytes; padding/truncating');
}

export interface EncryptedBlob {
  ciphertext: Buffer;
  /** AES-GCM IV for the ciphertext (12 bytes) */
  iv: string; // base64
  /** AES-GCM auth tag (16 bytes) */
  authTag: string; // base64
  /** Wrapped per-content key */
  wrappedKey: string; // base64 — concatenation of (12-byte wrapIV) + (32-byte ciphertext) + (16-byte wrapAuthTag)
  /** Identifier for the master key version, in case we rotate later. */
  keyVersion: string;
}

const KEY_VERSION = 'master-v1';

function gcmEncrypt(data: Buffer, key: Buffer): { ciphertext: Buffer; iv: Buffer; authTag: Buffer } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv) as CipherGCM;
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag };
}

function gcmDecrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, iv) as DecipherGCM;
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Encrypt media plaintext. Returns ciphertext (to upload) + metadata (to store in DB).
 */
export function encryptForStorage(plaintext: Buffer): EncryptedBlob {
  const perContentKey = randomBytes(32);
  const inner = gcmEncrypt(plaintext, perContentKey);

  // Wrap the per-content key with the master key (gcm again).
  const wrap = gcmEncrypt(perContentKey, MASTER_KEY);
  const wrappedKey = Buffer.concat([wrap.iv, wrap.ciphertext, wrap.authTag]).toString('base64');

  return {
    ciphertext: inner.ciphertext,
    iv: inner.iv.toString('base64'),
    authTag: inner.authTag.toString('base64'),
    wrappedKey,
    keyVersion: KEY_VERSION,
  };
}

/**
 * Decrypt media using the metadata stored in DB.
 */
export function decryptFromStorage(opts: {
  ciphertext: Buffer;
  iv: string;
  authTag: string;
  wrappedKey: string;
  keyVersion?: string;
}): Buffer {
  if (opts.keyVersion && opts.keyVersion !== KEY_VERSION) {
    throw new Error(`encryption.unsupported_key_version:${opts.keyVersion}`);
  }
  const wrappedBuf = Buffer.from(opts.wrappedKey, 'base64');
  if (wrappedBuf.length !== 12 + 32 + 16) {
    throw new Error('encryption.invalid_wrapped_key');
  }
  const wrapIv = wrappedBuf.subarray(0, 12);
  const wrappedCt = wrappedBuf.subarray(12, 12 + 32);
  const wrapTag = wrappedBuf.subarray(12 + 32);
  const perContentKey = gcmDecrypt(wrappedCt, MASTER_KEY, wrapIv, wrapTag);

  const iv = Buffer.from(opts.iv, 'base64');
  const authTag = Buffer.from(opts.authTag, 'base64');
  return gcmDecrypt(opts.ciphertext, perContentKey, iv, authTag);
}

export const AT_REST_KEY_VERSION = KEY_VERSION;
