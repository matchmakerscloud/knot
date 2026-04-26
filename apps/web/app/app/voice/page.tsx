'use client';

import { Screen, ScreenHeader } from '@/components/ui';
import { useAuthStore } from '@/lib/auth-store';

export default function VoiceHome() {
  const user = useAuthStore((s) => s.user);
  return (
    <Screen>
      <ScreenHeader kicker="Knot Voice" title={`Hola, ${user?.firstName ?? 'tú'}.`} />
      <p className="text-mute">
        Esto es Knot Voice. Te enamoras escuchando, no mirando.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Próximo paso</div>
        <h2 className="mt-2 text-xl">Graba tus 6 prompts</h2>
        <p className="mt-2 font-sans text-sm text-mute">
          Tu perfil empieza con 3 prompts obligatorios y 3 que tú eliges. Cada uno hasta 30 segundos. Iremos liberando esta función pronto.
        </p>
      </div>
    </Screen>
  );
}
