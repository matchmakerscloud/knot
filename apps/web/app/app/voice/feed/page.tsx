'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Screen, ScreenHeader, Button, FormError } from '@/components/ui';
import { AudioPlayer } from '@/components/audio-player';
import { VoiceRecorder, type RecordedAudio } from '@/components/voice-recorder';

interface FeedItem {
  recording: {
    id: string;
    promptText: string;
    durationSeconds: number;
    audioUrl: string;
    waveformPeaks: number[];
    anonymousAvatar: { color: string; shape: string };
  } | null;
  anonymizedUser: {
    ageBucket: string;
    distanceBucket: string;
    anonymousId: string;
  } | null;
  nextCursor: string | null;
}

export default function FeedPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'listen' | 'reply'>('listen');
  const [error, setError] = useState<string | undefined>();

  const feedQ = useQuery({
    queryKey: ['voice', 'feed'],
    queryFn: () => api.get<FeedItem>('/v1/voice/feed'),
    refetchOnMount: 'always',
  });

  const skip = useMutation({
    mutationFn: (recordingId: string) => api.post('/v1/voice/feed/' + recordingId + '/skip', {}),
    onSuccess: () => { setMode('listen'); qc.invalidateQueries({ queryKey: ['voice', 'feed'] }); },
  });
  const save = useMutation({
    mutationFn: (recordingId: string) => api.post('/v1/voice/feed/' + recordingId + '/save', {}),
    onSuccess: () => { setMode('listen'); qc.invalidateQueries({ queryKey: ['voice', 'feed'] }); },
  });
  const listenedFull = useMutation({
    mutationFn: (recordingId: string) => api.post('/v1/voice/feed/' + recordingId + '/listened-full', {}),
  });

  const reply = useMutation({
    mutationFn: async (input: { recordingId: string; audio: RecordedAudio }) => {
      const sign = await api.post<{ url: string; key: string; contentType: string }>('/v1/uploads/audio/sign', {
        contentType: input.audio.mime.mime || 'audio/webm',
        extension: input.audio.mime.extension,
        contentLength: input.audio.blob.size,
      });
      const put = await fetch(sign.url, { method: 'PUT', body: input.audio.blob, headers: { 'content-type': sign.contentType } });
      if (!put.ok) throw new Error('upload_failed');
      return api.post<{ id: string; status: string; chamberId: string | null }>(
        '/v1/voice/feed/' + input.recordingId + '/reply',
        {
          storageKey: sign.key,
          contentType: input.audio.mime.mime || 'audio/webm',
          durationSeconds: Math.max(1, Math.min(60, Math.round(input.audio.durationSeconds * 100) / 100)),
        },
      );
    },
    onSuccess: (data) => {
      setMode('listen');
      qc.invalidateQueries({ queryKey: ['voice', 'feed'] });
      if (data.chamberId) {
        router.push('/app/voice/chambers' as never);
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.error.message : err instanceof Error ? err.message : 'No pudimos enviar tu respuesta';
      setError(msg);
    },
  });

  if (feedQ.isPending) {
    return (
      <Screen>
        <p className="pt-12 text-center font-sans text-sm text-mute">Buscando audios para ti…</p>
      </Screen>
    );
  }

  const item = feedQ.data;
  if (!item || !item.recording) {
    return (
      <Screen>
        <ScreenHeader kicker="Knot Voice" title="Por ahora, nada nuevo" back={() => router.push('/app/voice')} />
        <p className="text-mute">
          Aún no hay audios en tu feed. Esto pasa al inicio — la red está creciendo. Vuelve en unas horas, o invita a alguien.
        </p>
        <Button fullWidth variant="ghost" className="mt-6" onClick={() => feedQ.refetch()}>
          Volver a buscar
        </Button>
      </Screen>
    );
  }

  const rec = item.recording;
  const anon = item.anonymizedUser!;

  return (
    <Screen>
      <ScreenHeader
        kicker={`Voice / ${anon.ageBucket} · ${anon.distanceBucket}`}
        title="Escucha"
        back={() => router.push('/app/voice')}
      />

      <div className="mb-4 rounded-2xl border border-border bg-card p-5">
        <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Prompt</div>
        <p className="mt-2 text-lg leading-snug">{rec.promptText}</p>
      </div>

      <AudioPlayer
        src={rec.audioUrl}
        waveformPeaks={rec.waveformPeaks}
        onListenedFull={() => listenedFull.mutate(rec.id)}
      />

      {mode === 'listen' ? (
        <div className="mt-6 grid grid-cols-3 gap-2">
          <Button variant="ghost" onClick={() => skip.mutate(rec.id)} loading={skip.isPending}>Saltar</Button>
          <Button variant="ghost" onClick={() => save.mutate(rec.id)} loading={save.isPending}>Guardar</Button>
          <Button onClick={() => setMode('reply')}>Responder</Button>
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-3 font-sans text-sm text-mute">
            Hasta 60s. La persona del audio recibirá tu respuesta. Si ambos responden, se abre un canal.
          </p>
          <VoiceRecorder
            disabled={reply.isPending}
            onComplete={(audio) => reply.mutate({ recordingId: rec.id, audio })}
          />
          {reply.isPending ? <p className="mt-4 text-center font-sans text-sm text-mute">Subiendo respuesta…</p> : null}
          {error ? <div className="mt-4"><FormError message={error} /></div> : null}
          <Button variant="ghost" fullWidth className="mt-3" onClick={() => setMode('listen')}>Cancelar</Button>
        </div>
      )}

      <p className="mt-8 mb-8 text-center font-sans text-xs text-mute">
        {anon.anonymousId}
      </p>
    </Screen>
  );
}
