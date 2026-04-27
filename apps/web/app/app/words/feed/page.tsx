'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiClientError } from '@/lib/api';
import { Screen, ScreenHeader, Button, Textarea, FormError } from '@/components/ui';

interface FeedResp {
  items: Array<{
    responseId: string;
    promptText: string;
    body: string;
    user: { firstName: string; ageBucket: string; anonymousId: string };
    createdAt: string;
  }>;
  nextCursor: string | null;
}

export default function WordsFeedPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | undefined>();

  const feedQ = useQuery({
    queryKey: ['words', 'feed'],
    queryFn: () => api.get<FeedResp>('/v1/words/feed'),
  });

  const like = useMutation({
    mutationFn: (input: { responseId: string; comment: string }) =>
      api.post<{ id: string; status: string; chamberId: string | null }>('/v1/words/likes', input),
    onSuccess: (data) => {
      setOpenId(null);
      setComment('');
      qc.invalidateQueries({ queryKey: ['words', 'feed'] });
      if (data.chamberId) {
        // Match: there's no Words chambers UI yet — go to voice chambers list (shared chambers backend)
        router.push('/app/voice/chambers' as never);
      }
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.error.message : 'No pudimos enviar tu like');
    },
  });

  return (
    <Screen>
      <ScreenHeader kicker="Knot Words" title="Feed" back={() => router.push('/app/words' as never)} />
      <p className="mb-4 font-sans text-sm text-mute">
        Likeas respuestas, no perfiles. Cada like requiere un comentario tuyo (mín 20 caracteres).
      </p>

      {feedQ.isPending ? (
        <p className="text-center font-sans text-sm text-mute">Cargando…</p>
      ) : (feedQ.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-mute">
          Aún no hay respuestas en tu feed. Pronto llegarán.
        </div>
      ) : (
        <ul className="space-y-3">
          {feedQ.data!.items.map((it) => (
            <li key={it.responseId} className="rounded-2xl border border-border bg-card p-5">
              <div className="font-sans text-xs uppercase tracking-wide2 text-mute">{it.promptText}</div>
              <p className="mt-3 leading-relaxed">{it.body}</p>
              <div className="mt-3 font-sans text-xs text-mute">
                {it.user.firstName} · {it.user.ageBucket.replace('_', ' ')}
              </div>
              {openId === it.responseId ? (
                <div className="mt-4 space-y-3">
                  <Textarea
                    name="comment"
                    rows={3}
                    placeholder="Comenta antes de likear (mín 20 caracteres)…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  {error ? <FormError message={error} /> : null}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (comment.trim().length < 20) {
                          setError('El comentario debe tener al menos 20 caracteres.');
                          return;
                        }
                        setError(undefined);
                        like.mutate({ responseId: it.responseId, comment: comment.trim() });
                      }}
                      loading={like.isPending}
                      fullWidth
                    >
                      Enviar like
                    </Button>
                    <Button variant="ghost" onClick={() => { setOpenId(null); setComment(''); setError(undefined); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  fullWidth
                  className="mt-4"
                  onClick={() => { setOpenId(it.responseId); setError(undefined); }}
                >
                  Comentar y likear
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
