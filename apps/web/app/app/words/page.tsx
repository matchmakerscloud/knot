'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Screen, ScreenHeader } from '@/components/ui';

interface ResponsesList {
  responses: Array<{
    id: string;
    promptText: string;
    body: string;
    position: number;
    status: string;
    likeCount: number;
    createdAt: string;
  }>;
}

export default function WordsHome() {
  const user = useAuthStore((s) => s.user);
  const myResponsesQ = useQuery({
    queryKey: ['words', 'responses'],
    queryFn: () => api.get<ResponsesList>('/v1/words/responses'),
  });

  const responses = myResponsesQ.data?.responses ?? [];
  const TARGET = 10;
  const completed = responses.length;

  return (
    <Screen>
      <ScreenHeader kicker="Knot Words" title={`Hola, ${user?.firstName ?? 'tú'}.`} />

      {completed === 0 ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <div className="font-sans text-xs uppercase tracking-wide2 text-accent">Empezamos por aquí</div>
          <h2 className="mt-2 text-xl">Tu manera de pensar es el perfil</h2>
          <p className="mt-3 font-sans text-sm text-mute">
            Vas a responder 10 prompts. Entre 100 y 280 caracteres por respuesta. Sé específico — los detalles concretos atraen.
          </p>
          <Link
            href={"/app/words/onboarding" as never}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 font-sans text-base text-bg"
          >
            Empezar a escribir
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Tu perfil</div>
              <div className="font-sans text-sm text-mute">{completed} / {TARGET}</div>
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: TARGET }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < completed ? 'bg-accent' : 'bg-border'}`} />
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Link href={"/app/words/feed" as never} className="rounded-2xl border border-accent bg-accent/5 px-3 py-4 text-center font-sans text-sm text-accent">
              Leer
            </Link>
            <Link href={"/app/words/likes" as never} className="rounded-2xl border border-border bg-card px-3 py-4 text-center font-sans text-sm text-mute">
              Tus likes
            </Link>
            <Link href={"/app/words/onboarding" as never} className="rounded-2xl border border-border bg-card px-3 py-4 text-center font-sans text-sm text-mute">
              {completed < TARGET ? `${TARGET - completed} faltan` : 'Editar'}
            </Link>
          </div>

          <h3 className="mt-8 mb-3 font-sans text-base text-mute">Tus respuestas</h3>
          <ul className="space-y-2">
            {responses.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="font-sans text-xs uppercase tracking-wide2 text-mute">{r.promptText}</div>
                <p className="mt-2 leading-relaxed">{r.body}</p>
                <div className="mt-2 font-sans text-xs text-mute">
                  {r.likeCount} {r.likeCount === 1 ? 'like' : 'likes'}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
