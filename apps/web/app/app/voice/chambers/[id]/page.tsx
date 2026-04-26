'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Screen, ScreenHeader, Button, FormError } from '@/components/ui';
import { AudioPlayer } from '@/components/audio-player';
import { VoiceRecorder, type RecordedAudio } from '@/components/voice-recorder';

interface ChamberDetail {
  chamber: {
    id: string;
    app: string;
    origin: string;
    status: string;
    createdAt: string;
  };
  messages: Array<{
    id: string;
    kind: 'voice' | 'text' | 'system';
    body: string | null;
    mine: boolean;
    createdAt: string;
    audioUrl?: string;
    durationSeconds?: number;
    waveformPeaks?: number[];
    transcript?: string | null;
  }>;
}

export default function ChamberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = use(params);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const q = useQuery({
    queryKey: ['chamber', id],
    queryFn: () => api.get<ChamberDetail>(`/v1/chambers/${id}`),
    refetchInterval: 5000,
  });

  const sendVoice = useMutation({
    mutationFn: async (audio: RecordedAudio) => {
      const sign = await api.post<{ url: string; key: string; contentType: string }>('/v1/uploads/audio/sign', {
        contentType: audio.mime.mime || 'audio/webm',
        extension: audio.mime.extension,
        contentLength: audio.blob.size,
      });
      const put = await fetch(sign.url, { method: 'PUT', body: audio.blob, headers: { 'content-type': sign.contentType } });
      if (!put.ok) throw new Error('upload_failed');
      return api.post(`/v1/chambers/${id}/messages`, {
        kind: 'voice',
        voiceStorageKey: sign.key,
        voiceContentType: audio.mime.mime || 'audio/webm',
        voiceDurationSeconds: Math.max(1, Math.min(120, Math.round(audio.durationSeconds * 100) / 100)),
      });
    },
    onSuccess: () => {
      setRecording(false);
      qc.invalidateQueries({ queryKey: ['chamber', id] });
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.error.message : 'No pudimos enviar el audio');
    },
  });

  if (q.isPending) {
    return (
      <Screen>
        <p className="pt-12 text-center font-sans text-sm text-mute">Cargando canal…</p>
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen>
        <ScreenHeader title="Canal no disponible" back={() => router.push('/app/voice/chambers' as never)} />
        <p className="text-mute">No pudimos cargar este canal.</p>
      </Screen>
    );
  }

  const data = q.data!;
  const ageMs = Date.now() - new Date(data.chamber.createdAt).getTime();
  const textLockedDays = Math.max(0, Math.ceil((3 * 24 * 60 * 60 * 1000 - ageMs) / (24 * 60 * 60 * 1000)));

  return (
    <Screen>
      <ScreenHeader kicker="Canal" title="Conversación" back={() => router.push('/app/voice/chambers' as never)} />

      {textLockedDays > 0 ? (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 font-sans text-sm text-accent">
          Solo voz por {textLockedDays} {textLockedDays === 1 ? 'día' : 'días'} más. Después se habilita texto.
        </div>
      ) : null}

      <ul className="flex flex-col gap-3 pb-4">
        {data.messages.map((m) => (
          <li key={m.id} className={m.kind === 'system' ? 'flex justify-center' : `flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            {m.kind === 'system' ? (
              <p className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 font-sans text-xs text-accent">{m.body}</p>
            ) : m.kind === 'text' ? (
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.mine ? 'bg-accent text-bg' : 'border border-border bg-card text-ink'}`}>
                <p>{m.body}</p>
              </div>
            ) : m.kind === 'voice' && m.audioUrl ? (
              <div className={`w-full ${m.mine ? 'pl-8' : 'pr-8'}`}>
                <AudioPlayer src={m.audioUrl} waveformPeaks={m.waveformPeaks} />
                {m.transcript ? (
                  <p className="mt-1 px-2 font-sans text-xs italic text-mute">"{m.transcript}"</p>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {recording ? (
        <div className="mt-4">
          <VoiceRecorder
            disabled={sendVoice.isPending}
            onComplete={(audio) => sendVoice.mutate(audio)}
          />
          {error ? <div className="mt-3"><FormError message={error} /></div> : null}
          <Button variant="ghost" fullWidth className="mt-3" onClick={() => { setRecording(false); setError(undefined); }}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button fullWidth onClick={() => setRecording(true)}>
          Grabar y enviar
        </Button>
      )}

      <div className="mt-6 mb-4 text-center">
        <button
          type="button"
          onClick={async () => {
            if (confirm('¿Seguro que quieres cerrar este canal? No se puede reabrir.')) {
              await api.post(`/v1/chambers/${id}/close`, {});
              router.push('/app/voice/chambers' as never);
            }
          }}
          className="font-sans text-xs text-mute hover:text-danger"
        >
          Cerrar canal
        </button>
      </div>
    </Screen>
  );
}
