import { SignJWT, jwtVerify } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import { config } from '../../config/index.js';

const ACCESS_SECRET = new TextEncoder().encode(config.auth.accessSecret);

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
}

export async function issueAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ uid: claims.userId, sid: claims.sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer('knot-api')
    .setAudience('knot-clients')
    .setExpirationTime(`${config.auth.accessTtlSeconds}s`)
    .sign(ACCESS_SECRET);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET, {
    issuer: 'knot-api',
    audience: 'knot-clients',
  });
  return { userId: String(payload.uid), sessionId: String(payload.sid) };
}

export function mintRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
