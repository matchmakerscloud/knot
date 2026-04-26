import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui';

export default function WordsLanding() {
  return (
    <Screen>
      <ScreenHeader kicker="Knot / Words" title="Tu manera de pensar es el perfil." />
      <p className="text-mute">
        Diez prompts profundos. Likeas respuestas individuales — y cada like exige un comentario propio. Sin fotos. Sin atajos.
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
