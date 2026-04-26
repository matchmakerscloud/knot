'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Screen, ScreenHeader, Button, FormError } from '@/components/ui';
import { VoiceRecorder, type RecordedAudio } from '@/components/voice-recorder';

interface Prompt {
  id: string;
  text: string;
  category: 'mandatory' | 'elective';
  locale: string;
}

interface PromptsResponse {
  prompts: Prompt[];
}

interface SignedUploadResponse {
  resourceId: string;
  url: string;
  key: string;
  expiresIn: number;
  contentType: string;
}

interface CreateRecordingResponse {
  id: string;
  status: string;
  estimatedReadyInSeconds: number;
}

const TOTAL_STEPS = 6;

export default function VoiceOnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const locale = (user?.locale as 'es' | 'en' | 'pt-BR' | undefined) ?? 'es';

  const [step, setStep] = useState(0); // 0..5 → currentPrompt = lineup[step]
  const [chosenElectives, setChosenElectives] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();

  const mandatoryQ = useQuery({
    queryKey: ['voice', 'prompts', 'mandatory', locale],
    queryFn: () => api.get<PromptsResponse>(`/v1/voice/prompts/available?locale=${locale}&category=mandatory`),
  });
  const electiveQ = useQuery({
    queryKey: ['voice', 'prompts', 'elective', locale],
    queryFn: () => api.get<PromptsResponse>(`/v1/voice/prompts/available?locale=${locale}&category=elective`),
  });

  const lineup = useMemo<Prompt[]>(() => {
    const m = mandatoryQ.data?.prompts ?? [];
    const elective = electiveQ.data?.prompts ?? [];
    const chosen = elective.filter((p) => chosenElectives.includes(p.id));
    return [...m.slice(0, 3), ...chosen.slice(0, 3)];
  }, [mandatoryQ.data, electiveQ.data, chosenElectives]);

  const upload = useMutation({
    mutationFn: async (input: { audio: RecordedAudio; promptId: string; position: number }) => {
      // 1) Sign upload URL.
      const sign = await api.post<SignedUploadResponse>('/v1/uploads/audio/sign', {
        contentType: input.audio.mime.mime || 'audio/webm',
        extension: input.audio.mime.extension,
        contentLength: input.audio.blob.size,
      });
      // 2) PUT directly to storage.
      const putRes = await fetch(sign.url, {
        method: 'PUT',
        body: input.audio.blob,
        headers: { 'content-type': sign.contentType },
      });
      if (!putRes.ok) throw new Error(`storage.put_failed:${putRes.status}`);
      // 3) Create the recording.
      return api.post<CreateRecordingResponse>('/v1/voice/recordings', {
        promptId: input.promptId,
        position: input.position,
        storageKey: sign.key,
        contentType: input.audio.mime.mime || 'audio/webm',
        durationSeconds: Math.max(1, Math.min(30, Math.round(input.audio.durationSeconds * 100) / 100)),
      });
    },
    onSuccess: () => {
      setError(undefined);
      if (step + 1 >= TOTAL_STEPS) {
        router.push('/app/voice');
      } else {
        setStep((s) => s + 1);
      }
    },
    onError: (err) => {
      const msg = err instanceof ApiClientError ? err.error.message : err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    },
  });

  if (mandatoryQ.isPending || electiveQ.isPending) {
    return (
      <Screen>
        <p className="pt-12 text-center font-sans text-sm text-mute">Cargando prompts…</p>
      </Screen>
    );
  }

  // Phase 1 — pick electives if not done yet
  if (chosenElectives.length < 3) {
    const elective = electiveQ.data?.prompts ?? [];
    return (
      <Screen>
        <ScreenHeader
          kicker="Knot Voice / Onboarding"
          title="Elige 3 prompts"
          back={() => router.push('/app/voice')}
        />
        <p className="font-sans text-sm text-mute">
          Después de los 3 obligatorios, elegís 3 que más te resuenen. Aún te faltan {3 - chosenElectives.length}.
        </p>
        <div className="mt-6 space-y-2">
          {elective.map((p) => {
            const selected = chosenElectives.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setChosenElectives((prev) =>
                    selected
                      ? prev.filter((x) => x !== p.id)
                      : prev.length < 3
                        ? [...prev, p.id]
                        : prev,
                  )
                }
                className={`block w-full rounded-xl border px-4 py-3 text-left text-base transition ${
                  selected ? 'border-accent bg-accent/10 text-ink' : 'border-border bg-card text-mute hover:border-accent/40'
                }`}
              >
                {p.text}
              </button>
            );
          })}
        </div>
        <div className="mt-6 mb-8">
          <Button
            fullWidth
            disabled={chosenElectives.length !== 3}
            onClick={() => setStep(0)}
          >
            Empezar a grabar ({chosenElectives.length}/3 elegidos)
          </Button>
        </div>
      </Screen>
    );
  }

  // Phase 2 — record one prompt at a time
  const prompt = lineup[step];
  if (!prompt) {
    // shouldn't happen
    return (
      <Screen>
        <ScreenHeader title="Listo" />
        <Button onClick={() => router.push('/app/voice')} fullWidth>Continuar</Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        kicker={`Voice / ${step + 1} de ${TOTAL_STEPS}`}
        title="Graba tu respuesta"
        back={step === 0 ? () => setChosenElectives([]) : () => setStep((s) => Math.max(0, s - 1))}
      />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Prompt</div>
        <p className="mt-2 text-xl leading-snug">{prompt.text}</p>
      </div>

      <VoiceRecorder
        disabled={upload.isPending}
        onComplete={(audio) =>
          upload.mutate({ audio, promptId: prompt.id, position: step + 1 })
        }
      />

      {upload.isPending ? (
        <p className="mt-4 text-center font-sans text-sm text-mute">Subiendo…</p>
      ) : null}
      {error ? <div className="mt-4"><FormError message={error} /></div> : null}

      <div className="mt-6 mb-8 flex items-center justify-center gap-1">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full ${i < step ? 'bg-accent' : i === step ? 'bg-accent/60' : 'bg-border'}`}
          />
        ))}
      </div>
    </Screen>
  );
}
