import Link from 'next/link';

const apps = [
  {
    slug: 'voice',
    name: 'Voice',
    tagline: 'Te enamoras escuchando, no mirando.',
    description:
      'Conoces personas escuchando notas de voz anónimas. Las fotos se desbloquean solo después del intercambio.',
  },
  {
    slug: 'words',
    name: 'Words',
    tagline: 'Tu manera de pensar es el perfil.',
    description:
      'Likeas respuestas a prompts profundos. Cada like requiere un comentario propio.',
  },
  {
    slug: 'match',
    name: 'Match',
    tagline: 'Un agente que conoce a ambos.',
    description:
      'Sin feed, sin swipe. Una IA te entrevista y te presenta personas con un dossier explicando el porqué.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-16">
        <h1 className="text-5xl font-medium tracking-tight">Knot</h1>
        <p className="mt-3 text-lg text-[var(--color-muted)]">
          El dating no se ve, se siente. Elige cómo quieres conectar.
        </p>
      </header>

      <section className="space-y-4">
        {apps.map((app) => (
          <Link
            key={app.slug}
            href={`/${app.slug}`}
            className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 transition hover:border-[var(--color-fg)]"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-medium">{app.name}</h2>
              <span className="text-sm text-[var(--color-muted)]">→</span>
            </div>
            <p className="mt-1 text-[var(--color-fg)]">{app.tagline}</p>
            <p className="mt-3 text-sm text-[var(--color-muted)]">{app.description}</p>
          </Link>
        ))}
      </section>

      <footer className="mt-16 text-sm text-[var(--color-muted)]">
        Pre-launch. Únete a la lista de espera.
      </footer>
    </main>
  );
}
