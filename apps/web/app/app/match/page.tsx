'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Screen, ScreenHeader, Button } from '@/components/ui';

interface OnboardingState {
  status: 'not_started' | 'in_progress' | 'awaiting_review' | 'complete';
  onboardingStartedAt?: string | null;
  onboardingCompletedAt?: string | null;
}

interface TodayResp {
  status: 'no_presentation' | 'presentation_available';
  presentation?: {
    id: string;
    dossier: { summary: string; commonGround: string; generativeDifference: string };
    conversationStarters: string[];
  };
}

export default function MatchHome() {
  const router = useRouter();
  const qc = useQueryClient();

  const stateQ = useQuery({
    queryKey: ['match', 'state'],
    queryFn: () => api.get<OnboardingState>('/v1/match/onboarding/state'),
  });

  const todayQ = useQuery({
    queryKey: ['match', 'today'],
    queryFn: () => api.get<TodayResp>('/v1/match/today'),
    enabled: stateQ.data?.status === 'complete',
  });

  const start = useMutation({
    mutationFn: () => api.post('/v1/match/onboarding/start', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match', 'state'] });
      router.push('/app/knot' as never);
    },
  });

  const accept = useMutation({
    mutationFn: (id: string) => api.post(`/v1/match/presentations/${id}/accept`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match', 'today'] }),
  });
  const decline = useMutation({
    mutationFn: (id: string) => api.post(`/v1/match/presentations/${id}/decline`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['match', 'today'] }),
  });

  if (stateQ.isPending) {
    return (
      <Screen>
        <p className="pt-12 text-center font-sans text-sm text-mute">Cargando…</p>
      </Screen>
    );
  }

  const state = stateQ.data!;

  if (state.status === 'not_started') {
    return (
      <Screen>
        <ScreenHeader kicker="Knot Match" title="Te presento la idea." />
        <p className="text-mute mb-6 leading-relaxed">
          Match no es swipe ni feed. Voy a entrevistarte durante una semana, una sesión corta por día.
          Cuando termine, te presento una persona a la vez con un dossier explicando por qué.
        </p>
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <h3 className="text-base">Cómo funciona</h3>
          <ul className="mt-3 space-y-2 font-sans text-sm text-mute">
            <li>· Día 1-6: hablamos. Sin apuro, sin formularios.</li>
            <li>· Día 7: confirmamos lo que entendí de ti.</li>
            <li>· Después: 1-2 presentaciones por semana, máximo.</li>
            <li>· Cero feed infinito. Cero scroll.</li>
          </ul>
        </div>
        <Button fullWidth loading={start.isPending} onClick={() => start.mutate()}>
          Empezar conmigo
        </Button>
      </Screen>
    );
  }

  if (state.status === 'in_progress' || state.status === 'awaiting_review') {
    return (
      <Screen>
        <ScreenHeader kicker="Knot Match" title="Sigamos hablando" />
        <p className="text-mute mb-6">
          Ya empezamos tu onboarding. Cuando termines de hablar conmigo, voy a poder presentarte gente.
        </p>
        <Link href="/app/knot" className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 font-sans text-base text-bg">
          Hablar con Knot
        </Link>
      </Screen>
    );
  }

  // status === 'complete'
  if (todayQ.isPending) {
    return (
      <Screen>
        <ScreenHeader kicker="Knot Match" title="Mirando quién…" />
        <p className="text-mute">Estoy revisando si encontré a alguien para presentarte.</p>
      </Screen>
    );
  }

  if (todayQ.data?.status !== 'presentation_available' || !todayQ.data.presentation) {
    return (
      <Screen>
        <ScreenHeader kicker="Knot Match" title="Estoy buscando." />
        <p className="text-mute leading-relaxed">
          Por ahora no tengo a nadie que valga presentarte. Esto es a propósito — prefiero esperar y traerte una persona que tenga sentido,
          que mostrarte cualquiera que pase por el algoritmo.
        </p>
        <p className="mt-4 text-mute">Te aviso cuando encuentre a alguien.</p>
      </Screen>
    );
  }

  const p = todayQ.data.presentation;
  return (
    <Screen>
      <ScreenHeader kicker="Knot Match" title="Te presento a alguien." />
      <article className="space-y-5">
        <section>
          <h3 className="font-sans text-xs uppercase tracking-wide2 text-mute">Quién es</h3>
          <p className="mt-2 leading-relaxed">{p.dossier.summary}</p>
        </section>
        <section>
          <h3 className="font-sans text-xs uppercase tracking-wide2 text-mute">Lo que tienen en común</h3>
          <p className="mt-2 leading-relaxed">{p.dossier.commonGround}</p>
        </section>
        <section>
          <h3 className="font-sans text-xs uppercase tracking-wide2 text-mute">Lo que podría hacerlos interesantes</h3>
          <p className="mt-2 leading-relaxed">{p.dossier.generativeDifference}</p>
        </section>
        <section>
          <h3 className="font-sans text-xs uppercase tracking-wide2 text-mute">Para abrir conversación</h3>
          <ul className="mt-3 space-y-2">
            {p.conversationStarters.map((s, i) => (
              <li key={i} className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-ink">
                {s}
              </li>
            ))}
          </ul>
        </section>
      </article>

      <div className="mt-8 mb-8 grid grid-cols-2 gap-2">
        <Button variant="ghost" loading={decline.isPending} onClick={() => decline.mutate(p.id)}>Pasar</Button>
        <Button loading={accept.isPending} onClick={() => accept.mutate(p.id)}>Conocer</Button>
      </div>
    </Screen>
  );
}
