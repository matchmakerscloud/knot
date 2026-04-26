import { config } from '../../../config/index.js';
import { hashPassword, verifyPassword } from '../../../shared/crypto/password.js';
import {
  issueAccessToken,
  mintRefreshToken,
  hashRefreshToken,
} from '../../../shared/crypto/tokens.js';
import { ConflictError, UnauthorizedError } from '../../../shared/errors.js';
import type { UsersRepository, CreateUserInput } from '../repositories/users.repository.js';
import type { SessionsRepository } from '../repositories/sessions.repository.js';
import type { User } from '../../../shared/db/schema/users.js';

export interface SignupInput {
  email: string;
  password: string;
  phone: string;
  firstName: string;
  dateOfBirth: string;
  gender: CreateUserInput['gender'];
  genderOtherLabel?: string | undefined;
  locale?: 'es' | 'en' | 'pt-BR' | undefined;
}

export interface RequestContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  deviceId?: string | undefined;
  deviceName?: string | undefined;
}

export interface AuthTokens {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
  ) {}

  async signup(input: SignupInput, ctx: RequestContext): Promise<AuthTokens> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictError('auth.email_in_use', 'Email already registered');

    const passwordHash = await hashPassword(input.password);
    const user = await this.users.create({
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      genderOtherLabel: input.genderOtherLabel ?? null,
      locale: input.locale ?? 'es',
    });
    return this.issueSession(user, ctx);
  }

  async login(
    input: { email: string; password: string; deviceId?: string | undefined; deviceName?: string | undefined },
    ctx: RequestContext,
  ): Promise<AuthTokens> {
    const user = await this.users.findByEmail(input.email);
    const ok = user && (await verifyPassword(input.password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedError('auth.invalid_credentials', 'Invalid email or password');
    }
    return this.issueSession(user, {
      ...ctx,
      deviceId: input.deviceId ?? ctx.deviceId,
      deviceName: input.deviceName ?? ctx.deviceName,
    });
  }

  async refresh(
    input: { refreshToken: string },
    ctx: RequestContext,
  ): Promise<AuthTokens> {
    const hash = hashRefreshToken(input.refreshToken);
    const session = await this.sessions.findActiveByHash(hash);
    if (!session) throw new UnauthorizedError('auth.refresh_invalid', 'Refresh token invalid or expired');

    const user = await this.users.findById(session.userId);
    if (!user) throw new UnauthorizedError('auth.refresh_invalid', 'Refresh token invalid or expired');

    await this.sessions.revoke(session.id);
    return this.issueSession(user, ctx);
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.sessions.findActiveByHash(hash);
    if (!session) return;
    await this.sessions.revoke(session.id);
  }

  private async issueSession(user: User, ctx: RequestContext): Promise<AuthTokens> {
    const refreshToken = mintRefreshToken();
    const session = await this.sessions.create({
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      deviceId: ctx.deviceId ?? null,
      deviceName: ctx.deviceName ?? null,
      userAgent: ctx.userAgent ?? null,
      ipAddress: ctx.ipAddress ?? null,
      expiresAt: new Date(Date.now() + config.auth.refreshTtlDays * 24 * 60 * 60 * 1000),
    });
    const accessToken = await issueAccessToken({ userId: user.id, sessionId: session.id });
    return {
      user,
      accessToken,
      refreshToken,
      expiresIn: config.auth.accessTtlSeconds,
    };
  }
}
