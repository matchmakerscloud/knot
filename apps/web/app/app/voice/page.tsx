'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Screen, ScreenHeader } from '@/components/ui';

interface RecordingsList {
  recordings: Array<{
    id: string;
    promptText: string;
    position: number;
    durationSeconds: number;
    status: string;
    createdAt: string;
  }>;
}

export default function VoiceHome() {
  const user = useAuthStore((s) => s.user);

  const recordingsQ = useQuery({
    queryKey: ['voice', 'recordings'],
    queryFn: () => api.get<RecordingsList>('/v1/voice/recordings'),
  });

  const recs = recordingsQ.data?.recordings ?? [];
  const completed = recs.length;
  const TOTAL = 6;

  return (
    <Screen>
      <ScreenHeader kicker="Knot Voice" title={`Hola, ${user?.firstName ?? 'tú'}.`} />

      {completed === 0 ? (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <div className="font-sans text-xs uppercase tracking-wide2 text-accent">Empezamos por aquí</div>
          <h2 className="mt-2 text-xl">Tu perfil empieza con tu voz</h2>
          <p className="mt-3 font-sans text-sm text-mute">
            Vas a grabar 6 audios de hasta 30 segundos cada uno. 3 prompts que rotan cada semana, y 3 que tú eliges. Esto le dice a Knot cómo sos.
          </p>
          <Link
            href="/app/voice/onboarding"
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 font-sans text-base text-bg transition active:scale-[0.98]"
          >
            Empezar a grabar
          </Link>
        </div>
      ) : (
        <div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Tu perfil</div>
              <div className="font-sans text-sm text-mute">{completed} / {TOTAL}</div>
            </div>
            <div className="mt-3 flex gap-1">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < completed ? 'bg-accent' : 'bg-border'}`} />
              ))}
            </div>
            {completed < TOTAL ? (
              <Link
                href="/app/voice/onboarding"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-accent px-6 py-3 font-sans text-sm text-accent"
              >
                Continuar grabando ({TOTAL - completed} faltan)
              </Link>
            ) : (
              <p className="mt-4 font-sans text-sm text-success">
                Perfil completo.
              </p>
            )}
          </div>

          {completed >= TOTAL ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link href="/app/voice/feed" className="rounded-2xl border border-accent bg-accent/5 px-3 py-4 text-center font-sans text-sm text-accent hover:bg-accent/10">
                Escuchar
              </Link>
              <Link href={"/app/voice/replies" as never} className="rounded-2xl border border-border bg-card px-3 py-4 text-center font-sans text-sm text-mute hover:border-accent/40 hover:text-ink">
                Te respondieron
              </Link>
              <Link href={"/app/voice/chambers" as never} className="rounded-2xl border border-border bg-card px-3 py-4 text-center font-sans text-sm text-mute hover:border-accent/40 hover:text-ink">
                Canales
              </Link>
            </div>
          ) : null}

          <h3 className="mt-8 mb-3 text-base font-sans text-mute">Mis grabaciones</h3>
          <ul className="space-y-2">
            {recs.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm">{r.promptText}</p>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1 font-sans text-xs text-mute">
                  Posición {r.position} · {r.durationSeconds}s
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Screen>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    processing: { label: 'procesando', cls: 'text-mute border-border' },
    active: { label: 'activo', cls: 'text-success border-success/40' },
    rejected: { label: 'rechazado', cls: 'text-danger border-danger/40' },
    archived: { label: 'archivado', cls: 'text-mute border-border' },
  };
  const m = map[status] ?? map.processing!;
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}
