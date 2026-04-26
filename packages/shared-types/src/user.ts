import { z } from 'zod';

export const GenderSchema = z.enum([
  'male',
  'female',
  'non_binary',
  'prefer_not_to_say',
  'other',
]);
export type Gender = z.infer<typeof GenderSchema>;

export const UserStatusSchema = z.enum([
  'pending_verification',
  'active',
  'suspended',
  'deleted',
]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const AppKindSchema = z.enum(['voice', 'words', 'match']);
export type AppKind = z.infer<typeof AppKindSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  dateOfBirth: z.string(),
  gender: GenderSchema,
  genderOtherLabel: z.string().nullable(),
  status: UserStatusSchema,
  emailVerifiedAt: z.string().datetime().nullable(),
  phoneVerifiedAt: z.string().datetime().nullable(),
  identityVerifiedAt: z.string().datetime().nullable(),
  locale: z.string(),
  timezone: z.string(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  phone: z.string().regex(/^\+\d{8,15}$/),
  firstName: z.string().min(1).max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: GenderSchema,
  genderOtherLabel: z.string().max(50).optional(),
  locale: z.enum(['es', 'en', 'pt-BR']).default('es'),
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(32),
});
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const LogoutResponseSchema = z.object({ ok: z.literal(true) });
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
