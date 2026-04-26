'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Screen, ScreenHeader } from '@/components/ui';
import { AudioPlayer } from '@/components/audio-player';

interface RepliesList {
  replies: Array<{
    id: string;
    fromAnonymousId: string;
    parentRecordingId: string;
    audioUrl: string;
    durationSeconds: number;
    createdAt: string;
    expiresAt: string;
  }>;
}

export default function RepliesReceivedPage() {
  const router = useRouter();
  const repliesQ = useQuery({
    queryKey: ['voice', 'replies', 'received'],
    queryFn: () => api.get<RepliesList>('/v1/voice/replies/received'),
  });

  return (
    <Screen>
      <ScreenHeader kicker="Knot Voice" title="Te respondieron" back={() => router.push('/app/voice')} />
      <p className="mb-6 text-mute">
        Estas personas respondieron a uno de tus prompts. Si quieres conectar, responde con un audio — eso abre el canal.
      </p>

      {repliesQ.isPending ? (
        <p className="text-center font-sans text-sm text-mute">Cargando…</p>
      ) : (repliesQ.data?.replies.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-mute">Nada todavía. Cuando alguien responda a tus audios, va a aparecer acá.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {repliesQ.data!.replies.map((r) => {
            const expiresIn = Math.max(0, Math.floor((new Date(r.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-baseline justify-between font-sans text-xs">
                  <span className="uppercase tracking-wide2 text-mute">{r.fromAnonymousId}</span>
                  <span className="text-mute">expira en {expiresIn}d</span>
                </div>
                <AudioPlayer src={r.audioUrl} />
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/app/voice/replies/${r.id}` as never)
                  }
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 font-sans text-base text-bg"
                >
                  Responder con audio
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
