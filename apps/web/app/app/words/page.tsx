'use client';

import { Screen, ScreenHeader } from '@/components/ui';

export default function WordsHome() {
  return (
    <Screen>
      <ScreenHeader kicker="Knot Words" title="Palabras." />
      <p className="text-mute">Tu manera de pensar es el perfil.</p>
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="font-sans text-xs uppercase tracking-wide2 text-mute">Próximo paso</div>
        <h2 className="mt-2 text-xl">Responde 10 prompts</h2>
        <p className="mt-2 font-sans text-sm text-mute">
          Entre 100 y 280 caracteres por respuesta. Sé específico, los detalles concretos atraen.
        </p>
      </div>
    </Screen>
  );
}
