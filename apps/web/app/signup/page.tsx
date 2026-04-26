'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Input, Screen, ScreenHeader, FormError } from '@/components/ui';

const GENDERS = [
  { v: 'female', l: 'Mujer' },
  { v: 'male', l: 'Hombre' },
  { v: 'non_binary', l: 'No binario' },
  { v: 'prefer_not_to_say', l: 'Prefiero no decir' },
  { v: 'other', l: 'Otro' },
] as const;

interface SignupForm {
  email: string;
  password: string;
  phone: string;
  firstName: string;
  dateOfBirth: string;
  gender: (typeof GENDERS)[number]['v'];
  genderOtherLabel?: string;
}

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

export default function SignupPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [form, setForm] = useState<SignupForm>({
    email: '',
    password: '',
    phone: '',
    firstName: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
  });
  const [error, setError] = useState<string | undefined>();

  const m = useMutation({
    mutationFn: (body: SignupForm) =>
      api.post<AuthResponse>('/v1/auth/signup', { ...body, locale: navigatorLocale() }, { skipAuth: true }),
    onSuccess: (data) => {
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      router.push('/app');
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        if (err.error.code === 'auth.email_in_use') setError('Ese correo ya está registrado. Prueba iniciar sesión.');
        else if (err.error.code === 'common.validation_failed') setError('Revisa los datos. Algo no es válido.');
        else setError(err.error.message);
      } else setError('No pudimos crear tu cuenta. Inténtalo de nuevo.');
    },
  });

  return (
    <Screen>
      <ScreenHeader kicker="Knot" title="Crea tu cuenta" back={() => router.push('/')} />

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          m.mutate(form);
        }}
      >
        <Input
          label="Nombre"
          name="firstName"
          type="text"
          required
          autoComplete="given-name"
          value={form.firstName}
          onChange={(e) => setForm({ ...form, firstName: e.target.value })}
        />
        <Input
          label="Correo"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="Mínimo 8 caracteres."
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Input
          label="Teléfono"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="+56 9 ..."
          hint="Formato internacional, con +."
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Fecha de nacimiento"
          name="dateOfBirth"
          type="date"
          required
          value={form.dateOfBirth}
          onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
        />

        <div>
          <span className="mb-2 block font-sans text-sm text-mute">Género</span>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.v}
                type="button"
                onClick={() => setForm({ ...form, gender: g.v })}
                className={`rounded-xl border px-3 py-3 font-sans text-sm transition ${form.gender === g.v ? 'border-accent bg-accent/10 text-ink' : 'border-border bg-card text-mute hover:border-accent/40'}`}
              >
                {g.l}
              </button>
            ))}
          </div>
          {form.gender === 'other' ? (
            <div className="mt-2">
              <Input
                name="genderOtherLabel"
                placeholder="Cómo te identificas"
                value={form.genderOtherLabel ?? ''}
                onChange={(e) => setForm({ ...form, genderOtherLabel: e.target.value })}
              />
            </div>
          ) : null}
        </div>

        <FormError message={error} />

        <Button type="submit" fullWidth loading={m.isPending} className="mt-2">
          Crear cuenta
        </Button>

        <p className="mt-2 text-center font-sans text-sm text-mute">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>

      <p className="mt-8 mb-8 text-center font-sans text-xs text-mute">
        Al continuar aceptas nuestros{' '}
        <Link href="/legal/terms" className="underline">
          Términos
        </Link>{' '}
        y{' '}
        <Link href="/legal/privacy" className="underline">
          Privacidad
        </Link>
        .
      </p>
    </Screen>
  );
}

function navigatorLocale(): 'es' | 'en' | 'pt-BR' {
  if (typeof navigator === 'undefined') return 'es';
  const l = navigator.language;
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('pt')) return 'pt-BR';
  return 'es';
}
