import {
  SignupRequestSchema,
  LoginRequestSchema,
  AuthResponseSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  LogoutResponseSchema,
} from '@knot/shared-types';

export const Schemas = {
  Signup: { body: SignupRequestSchema, response: AuthResponseSchema },
  Login: { body: LoginRequestSchema, response: AuthResponseSchema },
  Refresh: { body: RefreshRequestSchema, response: RefreshResponseSchema },
  Logout: { body: RefreshRequestSchema, response: LogoutResponseSchema },
};
