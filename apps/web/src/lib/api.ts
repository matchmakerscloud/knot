import { useAuthStore } from './auth-store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.matchmakers.cloud';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(error.message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  // Internal flag to prevent infinite refresh loops
  _retried?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, _retried, ...rest } = opts;
  const auth = useAuthStore.getState();

  const headers = new Headers(rest.headers);
  if (body !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (!skipAuth && auth.accessToken) {
    headers.set('authorization', `Bearer ${auth.accessToken}`);
  }

  const init: RequestInit = {
    ...rest,
    headers,
    credentials: 'include',
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE_URL}${path}`, init);

  if (res.status === 401 && !skipAuth && !_retried && auth.refreshToken) {
    // Try to refresh once, then retry the original request
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...opts, _retried: true });
    }
    auth.clear();
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: ApiError } | null;
    throw new ApiClientError(
      res.status,
      errBody?.error ?? { code: 'common.unknown', message: `HTTP ${res.status}` },
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string; expiresIn: number };
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
