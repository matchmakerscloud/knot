# Arquitectura técnica de Knot

Este documento describe el stack, las decisiones arquitectónicas y los patrones que usamos en todo el monorepo.

## Stack consolidado

### Backend

| Componente | Tecnología | Justificación |
|---|---|---|
| Runtime | Node.js 20 LTS | Estándar, ecosistema robusto, performance suficiente. |
| Lenguaje | TypeScript 5.x | Type safety, refactoring seguro, mejor DX. |
| Framework HTTP | Fastify 4 | Más rápido y type-safe que Express, ecosistema de plugins. |
| ORM | Drizzle ORM | Type-safe, ligero, SQL transparente. Evita complejidad de Prisma. |
| Base de datos | PostgreSQL 16 + pgvector | Datos relacionales + embeddings vectoriales en una sola DB. |
| Cache | Redis 7 | Sesiones, rate limiting, feed cache, queue de jobs. |
| Storage de archivos | S3-compatible (MinIO en dev, AWS S3 prod) | Audios, fotos, documentos. |
| Job queue | BullMQ | Sobre Redis. Procesamiento de audio, generación de dossiers, notificaciones. |
| Real-time | @fastify/websocket | WebSockets nativos de Fastify, sin Socket.io. |
| Validación | Zod | Esquemas que sirven como tipos y validación. |
| Auth | Custom JWT + refresh tokens, Argon2 para passwords | Sin dependencia de servicios externos. |
| Email | Resend | Transactional emails simples. |
| SMS | Twilio | Verificación por SMS en onboarding. |
| Push notifications | Expo Push API + APNs/FCM | Vía Expo en mobile. |
| Audio processing | FFmpeg + audiowaveform CLI | Transcoding y waveforms. |
| Voice fingerprinting | pyannote.audio (microservicio Python) | Anti-catfish en Voice. |
| Moderación | OpenAI Moderation API + Hive AI | Texto y audio/imagen respectivamente. |
| LLM | Anthropic Claude (matchmaking, dossiers) + OpenAI (embeddings, transcripción) | Cada uno donde brilla. |
| Observability | OpenTelemetry → Grafana Cloud | Logs, traces, metrics. |
| Error tracking | Sentry | Errores de cliente y servidor. |

### Mobile

| Componente | Tecnología | Justificación |
|---|---|---|
| Framework | React Native + Expo (SDK 51+) | Code share con web, deploy rápido, ecosistema. |
| Navegación | Expo Router (file-based) | Convención clara, deep linking nativo. |
| Estado | Zustand + TanStack Query | Estado UI simple + cache de servidor. |
| API client | TypeScript fetch wrapper generado de schemas Zod | Tipos compartidos con backend. |
| UI | Componentes propios + Reanimated 3 | Sin librerías de UI pesadas. Identidad visual única. |
| Audio | expo-av (grabación) + expo-audio (playback) | Estándar de Expo. |
| Push | expo-notifications | Nativo de Expo. |
| Storage local | expo-secure-store + MMKV | Tokens en secure store, cache en MMKV. |
| Forms | react-hook-form + Zod | Validación type-safe. |
| i18n | i18next + react-i18next | Estándar, soporta plurales y formato. |
| Tests | Vitest (unit) + Detox (E2E) | Performance y cobertura. |

### Web

| Componente | Tecnología | Justificación |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR/SSG, edge runtime, ecosistema. |
| Estilos | Tailwind CSS 4 + variantes propias | Consistencia con design system. |
| Estado | Zustand + TanStack Query | Igual que mobile, código compartido. |
| UI | Radix Primitives sin estilos + propios | Accesibilidad sin sacrificar diseño. |
| Forms | react-hook-form + Zod | Igual que mobile. |
| Tests | Vitest + Playwright | Estándar moderno. |

### Admin

Panel interno para moderación, gestión de usuarios, revisión de dossiers de Match.

| Componente | Tecnología |
|---|---|
| Framework | Next.js 14 |
| UI | shadcn/ui (acelera el desarrollo, no es customer-facing) |
| Auth | OAuth con Google Workspace del equipo |

### Infraestructura

| Componente | Tecnología | Justificación |
|---|---|---|
| Contenedores | Docker | Estándar. |
| Orquestación (MVP) | Fly.io | Deploy simple, regiones globales, costo razonable. |
| Orquestación (escala) | AWS ECS o Kubernetes | Migración cuando los volúmenes lo justifiquen. |
| CDN | Cloudflare | Caché de assets estáticos, DDoS protection. |
| DNS | Cloudflare | Junto con el CDN. |
| CI/CD | GitHub Actions | Pipelines reproducibles. |
| Secret management | Doppler o AWS Secrets Manager | No usar `.env` en producción. |
| Domain monitoring | Pingdom o UptimeRobot | Alertas de disponibilidad. |

## Topología del sistema

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare (CDN, WAF)              │
└─────────────────────┬───────────────────────────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
       ▼              ▼              ▼
   Mobile (RN)   Web (Next)     Admin (Next)
       │              │              │
       └──────────────┴──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   API Gateway │  (Fastify + WebSocket)
              └──────┬───────┘
                     │
        ┌────────────┼────────────────┐
        │            │                │
        ▼            ▼                ▼
   PostgreSQL     Redis           S3 / MinIO
   + pgvector    (cache,         (audios,
                 sessions,        photos,
                 queues)          docs)
                     │
                     ▼
          ┌─────────────────────┐
          │  Worker (BullMQ)    │
          │  - Audio processing │
          │  - Dossier gen      │
          │  - Notifications    │
          └──────┬──────────────┘
                 │
        ┌────────┼─────────┬───────────┐
        ▼        ▼         ▼           ▼
   FFmpeg    pyannote   Claude API  OpenAI API
   (audio)   (voice ID)
```

## Decisiones arquitectónicas clave

### 1. Monorepo con pnpm + Turborepo

Las tres apps comparten lógica significativa (auth, perfiles, mensajería). Mantener un solo repo simplifica:

- Tipos compartidos entre back y front sin duplicación.
- Refactors atómicos.
- CI unificado.
- Onboarding de devs nuevos.

Turborepo gestiona la cache de builds y tasks paralelos.

### 2. Una sola API, tres "modos" de cliente

No hay un servicio por app. Hay una API que sirve a las tres apps. La distinción está en qué endpoints usa cada cliente. Razones:

- Mucho overlap (auth, perfiles, mensajería, reportes).
- Operacional más simple.
- Cuenta única para el usuario que puede saltar entre apps.

### 3. Drizzle sobre Prisma

Drizzle es más ligero, más cercano a SQL, más rápido en runtime, y tiene mejor type inference para queries complejas. Prisma tiene mejor tooling pero sus migraciones son problemáticas a escala. Para nuestro perfil (muchas queries específicas, performance crítica), Drizzle gana.

### 4. pgvector en lugar de DB vectorial separada

Iniciar con pgvector evita una pieza adicional de infraestructura. Tiene buen performance hasta ~10M vectores y se integra naturalmente con queries SQL. Si llegamos a escala donde no rinde, migramos a Pinecone o Qdrant — pero ese es un problema futuro.

### 5. Microservicio Python solo para voice fingerprinting

pyannote.audio es Python-native y no tiene equivalente robusto en Node. Levantamos un microservicio FastAPI dedicado únicamente a esa función. El resto del backend es Node/TS.

### 6. Worker separado del API

El procesamiento de audio, generación de dossiers, envío de notificaciones — todo va a un worker separado vía BullMQ. Esto permite:

- Escalar API y worker independientemente.
- Crash de worker no afecta API.
- Reintentos automáticos.
- Visibilidad de jobs (Bull Board).

### 7. WebSocket dedicado, no HTTP polling

Para notificaciones en tiempo real, "está grabando", presencia, etc. Reduce carga del servidor y mejora UX.

### 8. JWT corto + refresh token

- Access token: 15 min, sin estado, no se revoca.
- Refresh token: 30 días, almacenado en DB, revocable.
- Logout = revocación del refresh token.

### 9. Audio cifrado por contenido

Cada audio tiene su propia clave de cifrado. La clave se almacena cifrada con KMS. Esto permite revocar acceso a audios específicos sin afectar otros.

### 10. Feature flags desde día 1

Usamos un sistema simple basado en DB (tabla `feature_flags`) para:

- Rollouts graduales.
- A/B tests.
- Kill switches por usuario o cohorte.

LaunchDarkly cuando el volumen lo justifique.

## Patrones de código

### Inyección de dependencias

Cada módulo del backend recibe sus dependencias por constructor (services) o por contexto de Fastify (controllers). No usar singletons globales.

```ts
// services/voice.service.ts
export class VoiceService {
  constructor(
    private readonly db: Database,
    private readonly storage: ObjectStorage,
    private readonly queue: AudioQueue,
  ) {}
  // ...
}
```

### Repositorios

Toda lectura/escritura a la DB pasa por repositorios. Los services no tocan Drizzle directamente.

### Schemas Zod compartidos

Los esquemas viven en `packages/shared-types/`. El backend los usa para validación, el frontend para typing y forms.

```ts
export const VoicePromptSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(280),
  durationSeconds: z.number().min(1).max(30),
  audioUrl: z.string().url(),
});
export type VoicePrompt = z.infer<typeof VoicePromptSchema>;
```

### Errores estructurados

```ts
class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
```

### Logs con contexto

Cada request lleva un trace ID. Cada log incluye el trace ID, user ID (si autenticado), y módulo. Nada de logs textuales sin estructura.

## Performance targets

| Endpoint/operación | P95 latencia | Notas |
|---|---|---|
| Auth login | 200ms | Argon2 es el cuello. |
| Feed de Voice (cargar siguiente audio) | 100ms | Cache agresivo. |
| Subir audio (post-grabación) | 800ms | Incluye validación + queue. |
| Audio playback start | 300ms | URL firmada + CDN. |
| Match notification (websocket) | 500ms | Desde acción hasta otro device. |
| Generación de dossier (Match) | 30s | Es asíncrono, no bloquea. |

## Capacity planning inicial

MVP target: 10K usuarios totales, 1K MAU, 200 DAU.

- API: 2 instancias 1 vCPU / 2GB RAM.
- Worker: 1 instancia 2 vCPU / 4GB RAM.
- Postgres: db.t4g.medium AWS o equivalente, 50GB SSD.
- Redis: 1GB managed.
- S3: 100GB inicial (audios pesan ~120KB cada uno a 30s).

Costos estimados MVP: ~$300/mes infra + ~$500/mes APIs (LLM, transcripción, moderación) = $800/mes.

## Deployment

### Ambientes

- `local`: docker compose, MinIO local, Postgres local.
- `staging`: Fly.io, datos de prueba, accesible solo con VPN o IP allowlist.
- `production`: Fly.io con réplicas en mínimo 2 regiones.

### Pipeline

1. PR abierto → CI corre lint, typecheck, tests, build.
2. Merge a `main` → deploy automático a staging.
3. Tag manual `vX.Y.Z` → deploy manual a producción tras revisión.

### Rollback

Cada deploy mantiene la versión anterior por 24h. Rollback se hace con un comando único (`fly deploy --image previous-tag`).

### Migraciones de DB

- Migraciones siempre backwards-compatible (add column antes de remove, dual write durante migración).
- Drizzle Kit para generar migrations.
- Aplicación manual en staging, verificación, después prod.

## Compliance y privacidad

- **GDPR + CCPA + LGPD** desde día 1 (mercado global).
- **Right to deletion**: implementado con purge real a los 30 días.
- **Right to access**: usuario puede exportar todos sus datos en JSON.
- **Data retention**: audios borrados cuando se borra cuenta. Mensajes idem. Logs anonimizados a los 90 días.
- **DPA con todos los proveedores externos** (OpenAI, Anthropic, AWS, etc.).
- **Pen test anual** mínimo, cuando lleguemos a 50K usuarios.
- **SOC2** como meta a 12-18 meses.
