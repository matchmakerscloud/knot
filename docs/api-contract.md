# Contrato de API

Documento de referencia de los endpoints HTTP y eventos WebSocket de Knot. Sirve como fuente de verdad para frontend y backend.

## Convenciones

- Base URL: `https://api.knot.app/v1`
- Todas las respuestas son JSON.
- Auth por header `Authorization: Bearer <access_token>`.
- Errores con shape consistente:
  ```json
  {
    "error": {
      "code": "voice.recording.too_short",
      "message": "Recording must be at least 1 second",
      "details": { "minSeconds": 1, "actualSeconds": 0.6 }
    }
  }
  ```
- Paginación cursor-based con `cursor` en query y `nextCursor` en respuesta.
- Timestamps en ISO 8601 UTC.
- IDs siempre UUID.

## Códigos de error

| Status | Cuándo |
|---|---|
| 400 | Validación falló (Zod schema). |
| 401 | Sin auth o token inválido. |
| 403 | Auth correcto pero sin permiso. |
| 404 | Recurso no existe. |
| 409 | Conflicto (ej: ya likeaste a esta persona). |
| 422 | Estado inválido (ej: cuenta no verificada para acción que lo requiere). |
| 429 | Rate limit. |
| 500 | Error de servidor. |

## Autenticación

### POST /auth/signup

```json
{
  "email": "string",
  "password": "string",
  "phone": "string",
  "firstName": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "male|female|non_binary|prefer_not_to_say|other",
  "genderOtherLabel": "string?",
  "locale": "es|en|pt-BR"
}
```

**Response 201:**
```json
{
  "user": { /* User object */ },
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 900
}
```

### POST /auth/login

```json
{
  "email": "string",
  "password": "string",
  "deviceId": "string?",
  "deviceName": "string?"
}
```

### POST /auth/refresh

```json
{ "refreshToken": "string" }
```

### POST /auth/logout

Header con accessToken. Revoca el refresh token.

### POST /auth/verify-phone/request

```json
{ "phone": "string" }
```

Envía código SMS via Twilio.

### POST /auth/verify-phone/confirm

```json
{ "phone": "string", "code": "string" }
```

## Usuario

### GET /me

Devuelve el usuario actual + apps habilitadas + suscripciones activas + verification status.

### PATCH /me

Actualiza datos del usuario (campos editables: firstName, locale, timezone, preferencias).

### DELETE /me

Inicia el proceso de borrado. Soft delete inmediato, purge real a los 30 días.

### POST /me/apps/:app/enable

`:app` ∈ `voice | words | match`. Habilita la app en la cuenta del usuario.

### POST /me/apps/:app/pause

Pausa la app (no aparece en feed de otros).

### GET /me/preferences

### PUT /me/preferences

```json
{
  "interestedIn": ["female", "non_binary"],
  "ageMin": 24,
  "ageMax": 38,
  "maxDistanceKm": 50,
  "location": { "lat": -33.45, "lng": -70.65, "city": "Santiago", "country": "CL" }
}
```

### POST /me/photos

Multipart upload. Devuelve photo object con `id`, `position`, `blurHash`, `visibility: "unlocked_after_match"`.

### DELETE /me/photos/:id

### POST /me/identity-verification

Inicia liveness check + comparación con foto. Integra Onfido o equivalente.

## Knot Voice

### GET /voice/prompts/available?category=mandatory|elective&locale=es

Lista de prompts disponibles para grabar.

### POST /voice/recordings

Multipart upload del audio. Body además incluye `promptId` y `position` (1-9).

**Response 202:**
```json
{
  "id": "uuid",
  "status": "processing",
  "estimatedReadyInSeconds": 5
}
```

El audio entra a procesamiento. Status final por polling o WebSocket event.

### GET /voice/recordings/:id

```json
{
  "id": "uuid",
  "promptText": "string",
  "durationSeconds": 24.5,
  "status": "active",
  "audioUrl": "https://signed-url-5min.../",
  "waveformPeaks": [0.2, 0.8, ...],
  "transcript": "string",
  "stats": { "listened": 12, "saved": 3, "replied": 1 }
}
```

### DELETE /voice/recordings/:id

Marca como archivada.

### GET /voice/feed?cursor=xxx

Devuelve siguiente audio del feed (uno por request — el feed es un stream).

```json
{
  "recording": {
    "id": "uuid",
    "promptText": "Cuéntame de la última vez que te reíste hasta llorar",
    "durationSeconds": 28,
    "audioUrl": "...",
    "waveformPeaks": [...],
    "anonymousAvatar": { "color": "#7F77DD", "shape": "wave-3" }
  },
  "anonymizedUser": {
    "ageBucket": "twenties_late",
    "distanceBucket": "5-10km",
    "anonymousId": "ses_xxx"
  },
  "nextCursor": "..."
}
```

### POST /voice/feed/:recordingId/skip

### POST /voice/feed/:recordingId/save

### POST /voice/feed/:recordingId/reply

Multipart upload del audio de respuesta. Crea match si la otra persona también responde.

### GET /voice/saved

Lista de audios guardados por el usuario.

### POST /voice/today-prompt/recordings

Variante especial: graba para el prompt del día.

## Knot Words

### GET /words/prompts/available?locale=es

Pool de prompts disponibles.

### POST /words/responses

```json
{
  "promptId": "uuid",
  "body": "string (100-280 chars)",
  "position": 1
}
```

### GET /words/responses/:id

### PATCH /words/responses/:id

### DELETE /words/responses/:id

### POST /words/responses/draft

Guarda un draft (cifrado en cliente).

### GET /words/feed?cursor=xxx

Lista de respuestas individuales.

```json
{
  "items": [
    {
      "responseId": "uuid",
      "promptText": "string",
      "body": "string",
      "user": {
        "anonymousId": "ses_xxx",
        "firstName": "Mariana",
        "ageBucket": "twenties_late",
        "distanceBucket": "10-25km"
      }
    }
  ],
  "nextCursor": "..."
}
```

### POST /words/likes

```json
{
  "responseId": "uuid",
  "comment": "string (>=20 chars)"
}
```

### GET /words/likes/received?cursor=xxx

### POST /words/likes/:id/reply

Acepta el like (abre chamber).

### POST /words/likes/:id/decline

### GET /words/users/:userId/full-profile

Solo accesible si hay match en chamber. Devuelve las 10 respuestas.

## Knot Match

### POST /match/onboarding/start

Inicia el flujo de 7 días.

### GET /match/onboarding/state

```json
{
  "status": "in_progress",
  "currentDay": 3,
  "totalDays": 7,
  "nextSessionAvailableAt": "2026-04-27T15:00:00Z"
}
```

### POST /match/onboarding/sessions/:dayIndex/messages

Envía mensaje al asistente. Streaming response (SSE).

```json
{ "content": "string" }
```

**Response (text/event-stream):**
```
event: chunk
data: {"delta": "Cuéntame más sobre"}

event: chunk
data: {"delta": " esa experiencia."}

event: done
data: {"messageId": "uuid"}
```

### GET /match/onboarding/sessions/:dayIndex/messages?cursor=xxx

Historial de la sesión.

### GET /match/profile

El perfil semántico generado.

### POST /match/profile/refine

Solicita refinar el perfil con nueva información.

### GET /match/today

Vista principal: presentación pendiente o estado actual.

```json
{
  "presentation": {
    "id": "uuid",
    "user": { "firstName": "Sofía", "age": 31, "photoUrl": "...", "city": "Madrid" },
    "dossier": {
      "summary": "string (3 párrafos)",
      "commonGround": "string",
      "generativeDifference": "string"
    },
    "conversationStarters": ["string", "string", "string"]
  },
  "status": "presentation_available"
}
```

### POST /match/presentations/:id/accept

### POST /match/presentations/:id/decline

```json
{ "reason": "string?" }
```

### POST /match/presentations/:id/feedback

```json
{
  "score": 4,
  "comment": "string?"
}
```

### GET /match/conversations/with-ai

Chat con la IA matchmaker (post-onboarding, para refinamiento continuo).

## Mensajería (chambers)

### GET /chambers?app=voice|words|match&cursor=xxx

Lista de chambers activas del usuario.

### GET /chambers/:id

Detalle de una chamber con metadata (app, origen, estado de unlock).

### GET /chambers/:id/messages?cursor=xxx

Mensajes paginados.

### POST /chambers/:id/messages

Crea mensaje. Body varía según `kind`:

- `text`: `{ "kind": "text", "body": "..." }`
- `voice`: multipart con audio + `{"kind": "voice"}`
- `photo`: multipart con imagen + `{"kind": "photo"}`

### POST /chambers/:id/messages/:messageId/reactions

```json
{ "emoji": "❤️" }
```

### POST /chambers/:id/photo-unlock/request

Inicia el flujo de desbloqueo de fotos.

### POST /chambers/:id/photo-unlock/respond

```json
{ "accept": true }
```

### POST /chambers/:id/close

### POST /chambers/:id/ai-observer/dismiss

(Solo Match) Pide a la IA que salga del chat.

## Moderación y safety

### POST /reports

```json
{
  "targetKind": "user|voice_recording|words_response|message|photo",
  "targetId": "uuid",
  "reason": "spam|harassment|inappropriate_content|catfish|underage|other",
  "details": "string?"
}
```

### POST /blocks

```json
{ "userId": "uuid", "reason": "string?" }
```

### DELETE /blocks/:userId

### GET /blocks

## WebSocket

Endpoint: `wss://api.knot.app/v1/ws?token=<accessToken>`

Mensajes hacia cliente tienen shape:

```json
{
  "type": "string",
  "data": {}
}
```

### Eventos del servidor

#### `recording.processed`
```json
{ "type": "recording.processed", "data": { "recordingId": "uuid", "status": "active|rejected" } }
```

#### `match.created`
```json
{
  "type": "match.created",
  "data": {
    "app": "voice|words",
    "chamberId": "uuid",
    "preview": { /* mini preview */ }
  }
}
```

#### `chamber.message.new`
```json
{
  "type": "chamber.message.new",
  "data": { "chamberId": "uuid", "message": { /* full message object */ } }
}
```

#### `chamber.typing`
```json
{ "type": "chamber.typing", "data": { "chamberId": "uuid", "userId": "uuid", "kind": "voice|text" } }
```

#### `chamber.recording`
Específico de voice — alguien está grabando.

#### `chamber.photo_unlock_requested`
```json
{ "type": "chamber.photo_unlock_requested", "data": { "chamberId": "uuid", "byUserId": "uuid" } }
```

#### `chamber.photo_unlocked`

#### `match.presentation.available`
```json
{ "type": "match.presentation.available", "data": { "presentationId": "uuid" } }
```

### Eventos del cliente

#### `chamber.subscribe`
```json
{ "type": "chamber.subscribe", "chamberId": "uuid" }
```

#### `chamber.unsubscribe`

#### `chamber.typing.start`

#### `chamber.typing.stop`

#### `chamber.recording.start`

#### `chamber.recording.stop`

#### `presence.update`
Heartbeat.

## Rate limits

| Endpoint group | Límite |
|---|---|
| Auth (login, signup) | 5 / min por IP |
| Feed reads | 60 / min por usuario |
| Recordings/responses crear | 20 / día por usuario en MVP |
| Likes / replies | 30 / día (gratis), ilimitado (Plus) |
| Reports | 10 / día por usuario |
| WebSocket messages | 30 / segundo |

Headers de respuesta incluyen `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## Versionado

- Versión actual: `v1`.
- Cambios breaking se hacen en `v2`, mantenemos `v1` por mínimo 6 meses post-release de v2.
- Deprecaciones se anuncian con header `Deprecation: <date>` mínimo 90 días antes.
