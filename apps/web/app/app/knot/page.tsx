'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Screen, ScreenHeader, FormError } from '@/components/ui';

interface ConvMessage { id: number; role: 'user' | 'knot' | 'system'; content: string; createdAt: string }
interface ConvResp { conversationId: string; dayIndex?: number; messages: ConvMessage[] }
interface SendResp { message: ConvMessage | null }

type Channel = 'confidant' | 'match_onboarding' | 'voice_helper' | 'words_helper';

const CHANNEL_INTRO: Record<Channel, { title: string; subtitle: string }> = {
  confidant: {
    title: 'Habla conmigo',
    subtitle: 'Soy Knot. Lo que me cuentes acá queda entre nosotros.',
  },
  match_onboarding: {
    title: 'Knot Match · semana de presentación',
    subtitle: 'Una sesión por día durante 7 días. Sin apuro.',
  },
  voice_helper: {
    title: 'Te ayudo con tus prompts',
    subtitle: 'Pensamos juntos qué grabar.',
  },
  words_helper: {
    title: 'Te ayudo a escribir',
    subtitle: 'Pulimos tus respuestas para que no salgan genéricas.',
  },
};

export default function KnotChatPage({ searchParams }: { searchParams?: Promise<{ channel?: string }> }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [channel] = useState<Channel>('confidant'); // confidant by default; could read searchParams later
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | undefined>();
  const scrollerRef = useRef<HTMLUListElement>(null);

  const startQ = useQuery({
    queryKey: ['knot', 'conversation', channel],
    queryFn: () => api.post<ConvResp>('/v1/knot/conversations', { channel }),
  });

  const send = useMutation({
    mutationFn: (content: string) => {
      if (!startQ.data) throw new Error('not_ready');
      return api.post<SendResp>('/v1/knot/messages', {
        conversationId: startQ.data.conversationId,
        content,
      });
    },
    onMutate: async (content) => {
      // optimistic: add user message immediately
      const prev = qc.getQueryData<ConvResp>(['knot', 'conversation', channel]);
      if (prev) {
        const optimistic: ConvResp = {
          ...prev,
          messages: [
            ...prev.messages,
            { id: Date.now(), role: 'user', content, createdAt: new Date().toISOString() },
          ],
        };
        qc.setQueryData(['knot', 'conversation', channel], optimistic);
      }
    },
    onSuccess: async (data) => {
      setInput('');
      setError(undefined);
      // Refetch full conversation to get authoritative state
      await qc.invalidateQueries({ queryKey: ['knot', 'conversation', channel] });
      void data; // satisfy lint
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.error.message : 'No pudo responder Knot. Inténtalo de nuevo.');
    },
  });

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [startQ.data?.messages?.length, send.isPending]);

  const intro = CHANNEL_INTRO[channel];
  const messages = startQ.data?.messages ?? [];

  return (
    <Screen>
      <ScreenHeader kicker="Knot" title={intro.title} back={() => router.push('/app/me')} />
      <p className="-mt-2 mb-4 font-sans text-sm text-mute">{intro.subtitle}</p>

      <ul ref={scrollerRef} className="flex flex-col gap-3 overflow-y-auto pb-4" style={{ maxHeight: 'calc(100dvh - 16rem)' }}>
        {startQ.isPending ? (
          <li className="text-center font-sans text-sm text-mute">Knot está pensando…</li>
        ) : null}
        {messages.map((m) => (
          <li key={m.id} className={m.role === 'user' ? 'flex justify-end' : m.role === 'system' ? 'flex justify-center' : 'flex justify-start'}>
            {m.role === 'system' ? (
              <p className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 font-sans text-xs text-accent">{m.content}</p>
            ) : (
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-accent text-bg'
                    : 'border border-border bg-card text-ink'
                }`}
              >
                {m.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                ))}
              </div>
            )}
          </li>
        ))}
        {send.isPending ? (
          <li className="flex justify-start">
            <div className="rounded-2xl border border-border bg-card px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-mute" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-mute" style={{ animationDelay: '0.15s' }} />
                <span className="h-2 w-2 animate-pulse rounded-full bg-mute" style={{ animationDelay: '0.3s' }} />
              </span>
            </div>
          </li>
        ) : null}
      </ul>

      {error ? <div className="mb-3"><FormError message={error} /></div> : null}

      <form
        className="sticky bottom-20 mt-3 flex gap-2 bg-bg pb-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text || send.isPending) return;
          send.mutate(text);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe a Knot…"
          autoComplete="off"
          className="flex-1 rounded-full border border-border bg-card px-4 py-3 font-sans text-base text-ink placeholder:text-mute focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || send.isPending}
          className="rounded-full bg-accent px-5 py-3 font-sans text-base text-bg transition active:scale-95 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </Screen>
  );
}
