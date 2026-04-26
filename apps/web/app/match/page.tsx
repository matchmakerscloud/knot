import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui';

export default function MatchLanding() {
  return (
    <Screen>
      <ScreenHeader kicker="Knot / Match" title="Un agente que conoce a ambos." />
      <p className="text-mute">
        Sin feed. Sin swipe. Una IA te entrevista durante una semana y te presenta una o dos personas — con un dossier explicando por qué.
      </p>
      <div className="mt-8 space-y-3">
        <Link
          href="/signup"
          className="block rounded-2xl border border-accent bg-accent/10 px-5 py-4 font-sans text-center text-accent"
        >
          Crear cuenta
        </Link>
        <Link
          href="/"
          className="block rounded-2xl border border-border px-5 py-4 font-sans text-center text-mute hover:text-ink"
        >
          Volver
        </Link>
      </div>
    </Screen>
  );
}
