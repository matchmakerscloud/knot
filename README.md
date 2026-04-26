# Knot

> El dating no se ve, se siente.

Knot es una marca paraguas con tres productos hermanos que reinventan el online dating atacando un solo problema raíz: **decidimos a quién conocer con la información menos predictiva de compatibilidad: una foto.**

Las tres apps comparten una sola cuenta de usuario, una marca, y un stack — pero cada una apuesta a una señal distinta como reemplazo de la foto.

## Las tres apps

| App | Premisa | Mecánica core |
|---|---|---|
| **Knot Voice** | "Te enamoras escuchando, no mirando." | Feed de notas de voz anónimas. Las fotos se desbloquean solo después de un intercambio mutuo de audio. |
| **Knot Words** | "Tu manera de pensar es el perfil." | Likeas respuestas escritas a prompts profundos, no perfiles enteros. Cada like requiere un comentario mínimo. |
| **Knot Match** | "Un agente que conoce a ambos." | Sin feed, sin swipe. Una IA te entrevista, entiende qué buscas y te presenta 1-2 personas por semana con un dossier del match. |

## Estado del proyecto

Pre-development. Specs completas, arquitectura definida, listo para construir.

## Estructura del repositorio

Monorepo gestionado con `pnpm` workspaces.

```
knot/
├── apps/
│   ├── api/              # Backend (Node + Fastify + PostgreSQL)
│   ├── mobile/           # App móvil (React Native + Expo)
│   ├── web/              # Versión web responsive (Next.js)
│   └── admin/            # Panel interno de moderación (Next.js)
├── packages/
│   ├── shared-types/     # Tipos TypeScript compartidos
│   ├── ui-kit/           # Componentes UI reutilizables
│   └── audio-utils/      # Helpers para procesamiento de audio
├── infra/
│   ├── docker/           # Dockerfiles y docker-compose
│   └── migrations/       # Migraciones SQL
└── docs/                 # Especificaciones de producto y arquitectura
```

## Documentación

Antes de empezar a desarrollar, lee en este orden:

1. [`docs/architecture.md`](docs/architecture.md) — stack técnico y decisiones compartidas
2. [`docs/data-model.md`](docs/data-model.md) — modelo de datos
3. [`docs/api-contract.md`](docs/api-contract.md) — endpoints y eventos
4. [`docs/knot-voice-spec.md`](docs/knot-voice-spec.md) — spec de Voice
5. [`docs/knot-words-spec.md`](docs/knot-words-spec.md) — spec de Words
6. [`docs/knot-match-spec.md`](docs/knot-match-spec.md) — spec de Match
7. [`CLAUDE.md`](CLAUDE.md) — instrucciones para Claude Code

## Quick start

```bash
# Instalar dependencias
pnpm install

# Levantar servicios locales (Postgres, Redis, MinIO)
docker compose -f infra/docker/docker-compose.dev.yml up -d

# Correr migraciones
pnpm --filter api db:migrate

# Levantar API en modo dev
pnpm --filter api dev

# Levantar mobile (en otra terminal)
pnpm --filter mobile start

# Levantar web (en otra terminal)
pnpm --filter web dev
```

## Decisiones clave del proyecto

- **Mobile-first, web es secundario.** La experiencia primaria es nativa.
- **Las tres apps comparten cuenta y backend.** El usuario decide en qué experiencia vivir.
- **Privacidad por diseño.** Audios cifrados en reposo, fotos bloqueadas por default, eliminación inmediata al borrar cuenta.
- **Global desde día 1.** i18n desde el primer commit. Empezamos con español, inglés y portugués.

## Licencia

Propietario. Todos los derechos reservados.
