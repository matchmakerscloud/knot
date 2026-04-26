# Instrucciones para Claude Code

Este archivo contiene las convenciones, principios y prioridades para desarrollar Knot. Léelo antes de empezar cualquier tarea y refiérete a él cuando tengas dudas de criterio.

## Contexto del proyecto

Knot es una familia de tres apps de dating que ataca el problema de la superficialidad del dating actual. La premisa unificadora: la foto no es la información correcta para iniciar una conexión. Cada una de las tres apps reemplaza la foto por una señal distinta (voz, escritura, IA matchmaker).

Lee primero `docs/knot-voice-spec.md`, `docs/knot-words-spec.md`, `docs/knot-match-spec.md` para entender el producto.

## Principios de desarrollo

### 1. Privacidad y seguridad son features, no checkboxes

Esta es una app de dating. Estamos manejando datos extremadamente sensibles: voces, fotos, ubicación, mensajes íntimos. Cada decisión técnica debe pasar el filtro de "¿cómo proteger esto?".

- Todo dato sensible cifrado en reposo (AES-256-GCM).
- TLS 1.3 mínimo en todas las conexiones.
- Tokens JWT cortos (15 min) + refresh tokens.
- Rate limiting agresivo en endpoints de descubrimiento.
- Soft delete con purga real a 30 días, permitir purga inmediata bajo solicitud.
- Logs no contienen contenido de mensajes ni audio.
- Audios y fotos viven en S3 con URLs firmadas de corta duración (5 min).

### 2. La calidad del audio es feature crítico de Voice

Voice es la app que más depende de calidad técnica. Nunca comprometas:
- Captura: 48kHz, mono, sin compresión durante la grabación.
- Transcoding: Opus 32kbps para entrega (balance calidad/peso).
- Visualización de waveform: real-time durante grabación.
- Latencia de carga: target <300ms para empezar a reproducir.

### 3. Anti-abuse desde el día 1

El dating atrae malos actores. No dejes esto para después:
- Verificación de voz contra fotos (anti-catfish) en Voice.
- Verificación de selfie contra documento en todas.
- Reportes con un solo tap, con bloqueo automático mientras se revisa.
- Rate limiting por IP, por device, por cuenta.
- Detección de bots: ML para patrones de comportamiento sospechoso.
- Moderación de contenido (audio, texto, imagen) antes de publicar.

### 4. i18n desde el primer string

No hardcodees texto en inglés ni español. Todo string visible al usuario pasa por el sistema de i18n. Usar `react-intl` en mobile/web y `i18next` en backend para emails/notificaciones.

Idiomas iniciales: `es`, `en`, `pt-BR`. Estructura: `packages/i18n/locales/{lang}.json`.

### 5. Accesibilidad no negociable

- Contraste WCAG AA mínimo en todo texto.
- Soporte de screen readers en mobile (VoiceOver, TalkBack).
- Transcripciones automáticas de todos los audios en Voice.
- Tamaños de toque ≥44x44pt.
- No usar solo color para comunicar estado.

## Stack técnico

Definido en `docs/architecture.md`. Resumen rápido:

- **Backend:** Node.js 20 + TypeScript + Fastify + PostgreSQL 16 + Redis 7
- **Mobile:** React Native con Expo (managed workflow al inicio, eject si hace falta)
- **Web:** Next.js 14 con App Router
- **Admin:** Next.js 14
- **Storage:** S3-compatible (MinIO en dev, AWS S3 en prod)
- **Real-time:** WebSockets via `@fastify/websocket`
- **Audio processing:** FFmpeg + audiowaveform CLI
- **AI/ML:** OpenAI API (transcripción, embeddings), Anthropic Claude API (matchmaking en Knot Match)

## Convenciones de código

### TypeScript estricto en todo el monorepo

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true
}
```

### Nombres

- Archivos: `kebab-case.ts` (excepto componentes React: `PascalCase.tsx`)
- Variables/funciones: `camelCase`
- Tipos/interfaces: `PascalCase`
- Constantes globales: `SCREAMING_SNAKE_CASE`
- Tablas SQL: `snake_case`, plurales (`users`, `voice_prompts`)
- Endpoints: `kebab-case`, recursos en plural (`/api/v1/voice-prompts`)

### Estructura de archivos backend (`apps/api/src/`)

```
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── voice/         # Knot Voice
│   ├── words/         # Knot Words
│   ├── match/         # Knot Match
│   ├── messaging/
│   └── moderation/
├── shared/
│   ├── db/
│   ├── storage/
│   ├── ai/
│   ├── notifications/
│   └── crypto/
├── plugins/           # Plugins de Fastify
├── routes/            # Composición de rutas
├── config/
└── server.ts
```

Cada módulo expone: `controllers/`, `services/`, `repositories/`, `schemas/`, `types.ts`, `index.ts`.

### Estructura de archivos mobile (`apps/mobile/src/`)

```
src/
├── apps/
│   ├── voice/         # Pantallas y lógica de Knot Voice
│   ├── words/         # Pantallas y lógica de Knot Words
│   └── match/         # Pantallas y lógica de Knot Match
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── stores/        # Zustand stores
│   ├── api/           # Cliente API tipado
│   └── theme/
├── navigation/
├── i18n/
└── App.tsx
```

### Errores

- Backend: clases de error tipadas (`AppError`, `ValidationError`, `NotFoundError`, `ForbiddenError`).
- Nunca exponer stack traces al cliente.
- Todo error 5xx genera alerta a Sentry.
- Errores de validación devuelven códigos legibles por el cliente: `{ "code": "voice.prompt.too_short", "message": "..." }`.

### Tests

- Unit tests obligatorios en `services/` y `repositories/`.
- Integration tests para todos los endpoints públicos.
- E2E selectivos en flujos críticos (signup, primer match, primera grabación).
- Vitest para backend y unit, Detox para mobile E2E, Playwright para web E2E.
- Coverage mínimo: 70% en `services/`.

## Prioridades de desarrollo (Roadmap)

### Fase 0 — Infra base (semana 1)
- Monorepo con pnpm + Turborepo
- Docker compose (Postgres, Redis, MinIO)
- CI básico (GitHub Actions): lint, typecheck, test
- Auth básico: signup, login, JWT, refresh

### Fase 1 — Knot Voice MVP (semanas 2-5)
- Onboarding completo (6 prompts grabados)
- Verificación de voz
- Feed de descubrimiento
- Intercambio de audios y match
- Desbloqueo de fotos
- Reportes y bloqueos

### Fase 2 — Knot Words MVP (semanas 6-8)
- Onboarding (10 prompts escritos)
- Feed de respuestas
- Like-con-comentario y match
- Chat de texto

### Fase 3 — Knot Match MVP (semanas 9-12)
- Onboarding conversacional con IA
- Generación de perfil semántico (embeddings)
- Algoritmo de matching (similitud + diversidad)
- Presentación de matches con dossier
- Loop de feedback

### Fase 4 — Hardening (semanas 13-14)
- Moderación automatizada
- Anti-fraude
- Optimizaciones de performance
- Pruebas de carga

## Cosas a evitar

- **No agregues dependencias sin justificación.** Cada paquete es superficie de ataque.
- **No uses ORMs pesados.** Usamos `drizzle-orm` (ligero, type-safe). Nada de TypeORM ni Prisma para este proyecto.
- **No hagas N+1 queries.** Si Drizzle no te da una query, escribe SQL.
- **No metas lógica de negocio en controllers.** Todo va en services.
- **No uses any.** Si te tienta, es porque falta un tipo en `shared-types`.
- **No commitees secretos.** `.env.example` documenta variables; el `.env` real está gitignored.
- **No hagas auto-deploy a prod.** Por ahora todo deploy es manual y revisado.

## Cómo trabajar conmigo

Cuando recibas una tarea de Mario (el dueño del proyecto):

1. **Si la tarea es ambigua,** pregunta antes de codear. Una pregunta bien hecha vale más que 200 líneas tiradas.
2. **Si vas a tomar una decisión arquitectónica no documentada,** propónla en un breve `decision-log` antes de implementar.
3. **Cada PR debe contener:** descripción del cambio, captura/video si es UI, tests nuevos, y referencia a la sección de spec correspondiente.
4. **Si encuentras una contradicción entre las specs,** no la resuelvas en código — pregunta. La spec es la fuente de verdad y debe actualizarse primero.
5. **Si necesitas datos de prueba,** usa el seeder en `infra/seeders/`. Nunca uses datos reales para testing.

## Datos sensibles que necesitas configurar

Estos no están en el repo. Mario los proveerá:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` (S3)
- `JWT_SECRET` (generar con `openssl rand -hex 64`)
- `ENCRYPTION_KEY` (para cifrado de datos en reposo)
- `TWILIO_*` (para SMS de verificación)
- `EXPO_PUSH_TOKEN`
- `SENTRY_DSN`

Ver `.env.example` para el listado completo.

## Glosario

- **Prompt** (en Voice/Words): pregunta abierta a la que el usuario responde con voz o texto.
- **Match**: situación donde dos usuarios intercambiaron señal mutua de interés.
- **Dossier** (en Match): resumen generado por IA explicando por qué dos usuarios podrían conectar.
- **Chamber**: nombre interno de las conversaciones activas en Voice.
- **Voice fingerprint**: vector de identidad vocal generado al verificar al usuario, usado para detectar catfishing.
- **Listen-through rate**: % de usuarios que escuchan un audio completo (KPI clave de Voice).
