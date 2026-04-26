'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Screen, ScreenHeader } from '@/components/ui';

interface ChambersList {
  chambers: Array<{
    id: string;
    app: string;
    origin: string;
    status: string;
    lastMessageAt: string | null;
    createdAt: string;
    otherAnonymousId: string | null;
  }>;
}

export default function ChambersPage() {
  const router = useRouter();
  const q = useQuery({
    queryKey: ['chambers'],
    queryFn: () => api.get<ChambersList>('/v1/chambers/'),
    refetchInterval: 15000,
  });

  return (
    <Screen>
      <ScreenHeader kicker="Knot Voice" title="Tus canales" back={() => router.push('/app/voice')} />

      {q.isPending ? (
        <p className="text-center font-sans text-sm text-mute">Cargando…</p>
      ) : (q.data?.chambers.length ?? 0) === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-mute">
            Aún no hay canales abiertos. Un canal se abre cuando vos y otra persona se responden mutuamente con audios.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {q.data!.chambers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/voice/chambers/${c.id}` as never}
                className="block rounded-2xl border border-border bg-card p-4 transition hover:border-accent"
              >
                <div className="flex items-baseline justify-between font-sans text-xs">
                  <span className="uppercase tracking-wide2 text-mute">{c.otherAnonymousId ?? '?'}</span>
                  <span className="text-mute">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : '—'}</span>
                </div>
                <p className="mt-2 text-base text-ink">canal abierto</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
