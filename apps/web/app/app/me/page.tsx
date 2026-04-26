'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Button, Screen, ScreenHeader } from '@/components/ui';

export default function MePage() {
  const router = useRouter();
  const { user, refreshToken, clear } = useAuthStore();

  const logout = useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await api.post('/v1/auth/logout', { refreshToken }, { skipAuth: true }).catch(() => {});
      }
    },
    onSuccess: () => {
      clear();
      router.replace('/');
    },
  });

  return (
    <Screen>
      <ScreenHeader kicker="Tu cuenta" title={user?.firstName ?? 'Yo'} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <Row label="Correo" value={user?.email} />
        <Row label="Estado" value={user?.status} />
        <Row label="Idioma" value={user?.locale} />
        <Row
          label="Verificación de correo"
          value={user?.emailVerifiedAt ? 'verificado' : 'pendiente'}
          tone={user?.emailVerifiedAt ? 'ok' : 'warn'}
        />
      </section>

      <section className="mt-8 space-y-3">
        <Button variant="ghost" fullWidth disabled title="Próximamente">
          Sesiones y seguridad
        </Button>
        <Button variant="danger" fullWidth loading={logout.isPending} onClick={() => logout.mutate()}>
          Cerrar sesión
        </Button>
      </section>
    </Screen>
  );
}

function Row({ label, value, tone }: { label: string; value?: string | null | undefined; tone?: 'ok' | 'warn' | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <span className="font-sans text-sm text-mute">{label}</span>
      <span
        className={`font-sans text-sm ${tone === 'ok' ? 'text-success' : tone === 'warn' ? 'text-danger' : 'text-ink'}`}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}
