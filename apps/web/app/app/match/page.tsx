'use client';

import { Screen, ScreenHeader } from '@/components/ui';

export default function MatchHome() {
  return (
    <Screen>
      <ScreenHeader kicker="Knot Match" title="Match." />
      <p className="text-mute">Un agente que conoce a ambos.</p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Próximo paso</div>
        <h2 className="mt-2 text-xl">Conversa con la IA durante una semana</h2>
        <p className="mt-2 font-sans text-sm text-mute">
          15 minutos por día. Cuando termine, te presentamos uno o dos matches con un dossier explicando por qué.
        </p>
      </div>
    </Screen>
  );
}
