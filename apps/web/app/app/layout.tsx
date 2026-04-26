'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';

const TABS = [
  { href: '/app/voice' as const, label: 'Voice', icon: '◉' },
  { href: '/app/words' as const, label: 'Words', icon: '✎' },
  { href: '/app/match' as const, label: 'Match', icon: '◇' },
  { href: '/app/me' as const, label: 'Yo', icon: '◐' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, accessToken, refreshToken, user, setUser, clear } = useAuthStore();

  // Redirect to /login if not authenticated, after hydration
  useEffect(() => {
    if (!hydrated) return;
    if (!refreshToken && !accessToken) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, refreshToken, router]);

  // Hydrate user from /v1/me on first load (refreshes from server)
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ user: AuthUser }>('/v1/me/'),
    enabled: hydrated && !!refreshToken,
    retry: 0,
  });

  useEffect(() => {
    if (meQuery.data?.user) setUser(meQuery.data.user);
    if (meQuery.isError) {
      // refresh failed, clear and bounce
      clear();
      router.replace('/login');
    }
  }, [meQuery.data, meQuery.isError, setUser, clear, router]);

  if (!hydrated || (!user && meQuery.isPending)) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-mute font-sans text-sm">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-20">
      {children}
      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto grid max-w-app grid-cols-4">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + '/');
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center gap-1 py-3 font-sans text-xs ${active ? 'text-accent' : 'text-mute'}`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
