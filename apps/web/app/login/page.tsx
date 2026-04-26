'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Input, Screen, ScreenHeader, FormError } from '@/components/ui';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    emailVerifiedAt: string | null;
    status: string;
    locale: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  const m = useMutation({
    mutationFn: () =>
      api.post<AuthResponse>(
        '/v1/auth/login',
        {
          email,
          password,
          deviceName: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : undefined,
        },
        { skipAuth: true },
      ),
    onSuccess: (data) => {
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      router.push('/app');
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        if (err.error.code === 'auth.invalid_credentials') setError('Correo o contraseña inválidos.');
        else setError(err.error.message);
      } else setError('No pudimos iniciar sesión. Inténtalo de nuevo.');
    },
  });

  return (
    <Screen>
      <ScreenHeader kicker="Knot" title="Inicia sesión" back={() => router.push('/')} />

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          m.mutate();
        }}
      >
        <Input
          label="Correo"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" fullWidth loading={m.isPending} className="mt-2">
          Entrar
        </Button>
        <p className="mt-2 text-center font-sans text-sm text-mute">
          ¿Sin cuenta?{' '}
          <Link href="/signup" className="text-accent hover:underline">
            Crea una
          </Link>
        </p>
      </form>
    </Screen>
  );
}
