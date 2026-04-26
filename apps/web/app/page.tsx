'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Button, Input, Screen } from '@/components/ui';

const apps = [
  { slug: 'voice', name: 'Voice', tagline: 'Te enamoras escuchando, no mirando.' },
  { slug: 'words', name: 'Words', tagline: 'Tu manera de pensar es el perfil.' },
  { slug: 'match', name: 'Match', tagline: 'Un agente que conoce a ambos.' },
];

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'success' | 'error'; msg?: string }>({ kind: 'idle' });

  const submit = useMutation({
    mutationFn: async (input: { email: string }) =>
      api.post<{ ok: boolean; signupId?: string; alreadyOnList?: boolean }>(
        '/v1/waitlist/',
        { email: input.email, source: 'umbrella', locale: typeof navigator !== 'undefined' ? (navigator.language.startsWith('en') ? 'en' : navigator.language.startsWith('pt') ? 'pt-BR' : 'es') : 'es' },
        { skipAuth: true },
      ),
    onSuccess: () => {
      setStatus({ kind: 'success', msg: 'Listo. Revisa tu correo para confirmar.' });
      setEmail('');
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.error.message : 'Algo no salió bien. Inténtalo de nuevo.';
      setStatus({ kind: 'error', msg });
    },
  });

  return (
    <Screen>
      <header className="pt-12 pb-8">
        <div className="mb-8 font-sans text-xs uppercase tracking-wide2 text-mute">Knot</div>
        <h1 className="text-5xl font-medium leading-[1.05]">
          El dating no se <em className="not-italic text-accent">ve</em>,
          <br />
          se <em className="not-italic text-accent">siente</em>.
        </h1>
        <p className="mt-6 text-lg text-mute">
          Tres apps hermanas que reinventan cómo decidimos a quién conocer. Una sola cuenta. Tres caminos.
        </p>
      </header>

      <section className="space-y-3">
        {apps.map((a) => (
          <Link
            key={a.slug}
            href={`/${a.slug}` as never}
            className="group flex items-baseline justify-between rounded-2xl border border-border bg-card px-5 py-4 transition hover:border-accent"
          >
            <div>
              <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Knot {a.name}</div>
              <div className="mt-1 text-base text-ink">{a.tagline}</div>
            </div>
            <span className="text-mute transition group-hover:text-accent">→</span>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Únete al waitlist</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email) return;
            submit.mutate({ email });
          }}
          className="mt-3 flex flex-col gap-2 sm:flex-row"
        >
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={submit.isPending} variant="ghost">
            Sumarme
          </Button>
        </form>
        {status.kind === 'success' ? (
          <p className="mt-2 font-sans text-sm text-success">{status.msg}</p>
        ) : null}
        {status.kind === 'error' ? (
          <p className="mt-2 font-sans text-sm text-danger">{status.msg}</p>
        ) : null}
      </section>

      <section className="mt-10 flex items-center gap-3 text-sm text-mute">
        <Link href="/login" className="font-sans hover:text-ink">
          Ya tengo cuenta
        </Link>
        <span>·</span>
        <Link href="/signup" className="font-sans text-accent hover:underline">
          Crear cuenta
        </Link>
      </section>

      <footer className="mt-auto pt-12 pb-8 font-sans text-xs text-mute">
        <span className="inline-block h-1.5 w-1.5 animate-pulse-slow rounded-full bg-accent align-middle" />{' '}
        Pre-launch. hello@matchmakers.cloud
      </footer>
    </Screen>
  );
}
