import argon2 from 'argon2';
import { config } from '../../config/index.js';

const PEPPER = Buffer.from(config.auth.passwordPepper, 'utf-8');

const ARGON_OPTS = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 64 * 1024,
  parallelism: 1,
  secret: PEPPER,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain, { secret: PEPPER });
  } catch {
    return false;
  }
}
