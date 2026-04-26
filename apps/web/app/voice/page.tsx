import Link from 'next/link';
import { Screen, ScreenHeader } from '@/components/ui';

export default function VoiceLanding() {
  return (
    <Screen>
      <ScreenHeader kicker="Knot / Voice" title="Te enamoras escuchando, no mirando." />
      <p className="text-mute">
        Knot Voice reemplaza la foto por la voz. Audios anónimos, fotos solo después de match. La superficialidad simplemente no aplica.
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
