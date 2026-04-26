# Subdomain map — canónico

Decisiones tomadas el 2026-04-26 y configuradas en nginx/cert wildcard.

## matchmakers.cloud (paraguas + apps técnicas + Voice + Words)

| Subdominio | Servicio | Backend | Estado |
|---|---|---|---|
| `matchmakers.cloud`, `www.matchmakers.cloud` | Landing umbrella | static | ✅ live |
| `app.matchmakers.cloud` | Web app (Next.js) | localhost:3001 | ✅ proxy + fallback landing si app no corre |
| `api.matchmakers.cloud` | Fastify API + WebSocket | localhost:4000 | ✅ proxy listo (devuelve 503 hasta que arranque) |
| `admin.matchmakers.cloud` | Admin panel | localhost:3002 | ✅ proxy listo (TODO: IP allowlist antes de launch) |
| `voice.matchmakers.cloud` | Knot Voice landing | static | ✅ live |
| `words.matchmakers.cloud` | Knot Words landing | static | ✅ live |
| `match.matchmakers.cloud` | redirect → matchmaking.cloud | redirect 301 | ✅ live |
| `status.matchmakers.cloud` | Status page | reservado | 503 placeholder |
| `docs.matchmakers.cloud` | Developer docs / API ref | reservado | 503 placeholder |
| `cdn.matchmakers.cloud` | Static asset CDN | reservado | 503 placeholder |
| `media.matchmakers.cloud` | S3-proxy para uploads | reservado | 503 placeholder |
| `staging.matchmakers.cloud` | Staging env | reservado | 503 placeholder |
| `*.matchmakers.cloud` (otro) | Catch-all → umbrella landing | static | ✅ live |

## matchmaking.cloud (Knot Match standalone)

| Subdominio | Servicio | Backend | Estado |
|---|---|---|---|
| `matchmaking.cloud`, `www.matchmaking.cloud` | Knot Match landing | static | ✅ live |
| `app.matchmaking.cloud` | redirect → app.matchmakers.cloud | redirect 301 | ✅ live |
| `*.matchmaking.cloud` (otro) | Catch-all → Match landing | static | ✅ live |

## Diferenciación de tráfico

**Backend único por ahora** (`api.matchmakers.cloud`). Las tres apps llaman al mismo API; el header `X-Knot-App: voice|words|match` (que clientes envían) sirve para telemetría + feature flags. **No** hay endpoints separados por app.

**WebSocket** comparte el dominio de API: `wss://api.matchmakers.cloud/v1/ws?token=...`. nginx ya tiene config compatible con upgrade.

## Reglas operacionales

1. **No agregamos subdominios sin actualizar este mapa.**
2. **Nunca proxiamos `voice-fp` (Python microservice) a un subdominio público.** Vive en `127.0.0.1:5000` o red privada.
3. **Cualquier nuevo subdominio quedará automáticamente con SSL** porque el wildcard cert cubre `*.matchmakers.cloud` y `*.matchmaking.cloud`. Solo hay que agregar el `server { ... }` block.
4. **El admin panel** se restringe por IP (futuro `allow/deny` en nginx) **antes** de meter datos reales.
5. **CORS allowlist** en API debe contener: `https://app.matchmakers.cloud`, `https://app.matchmaking.cloud`, `https://admin.matchmakers.cloud`, y nada más en producción.
