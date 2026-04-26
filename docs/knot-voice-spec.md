# Knot Voice — Especificación de producto

> "Te enamoras escuchando, no mirando."

## 1. Tesis del producto

**Hipótesis central:** la voz transmite calidez, humor, inteligencia emocional, energía y autenticidad de una forma que una foto no puede capturar. Un audio de 30 segundos comunica más sobre alguien que cinco fotos cuidadosamente seleccionadas.

**Diferenciador único:** no es "Tinder con audio agregado". Es "audio primero, todo lo demás después". Las fotos existen, pero llegan después del match de voz.

**Audiencia primaria:** personas de 22-40 años que buscan conexiones más auténticas, frustradas con la superficialidad de las apps actuales. Funcionará especialmente bien con quienes valoran la conversación, el humor y el contenido sobre lo visual.

## 2. Onboarding (≤3 minutos total)

### Paso 1 — Datos básicos (30s)

- Nombre (público)
- Fecha de nacimiento (no editable después)
- Ubicación (geolocalización con permiso)
- Género (opciones inclusivas: hombre, mujer, no binario, prefiero no decir, otro con campo libre)
- A quién quiere conocer (selección múltiple)
- Distancia máxima (10 / 25 / 50 / 100 km / sin límite)
- Rango de edad de interés

### Paso 2 — Seis prompts de voz (≤2 minutos)

Pantalla por prompt. Cada uno permite hasta 30 segundos. El usuario puede regrabar antes de confirmar. Tres prompts son obligatorios, tres son electivos seleccionables de un pool de ~20.

**Prompts obligatorios (rotan semanalmente):**
- "Cuéntame de la última vez que te reíste hasta llorar."
- "Algo que aprendiste recientemente que te voló la cabeza."
- "Tu opinión impopular sobre algo cotidiano."

**Pool de prompts electivos (selección de 3):**
- "Describe tu domingo perfecto."
- "Una cosa que te emociona del futuro."
- "El compliment que más recuerdas haber recibido."
- "Tu canción favorita y por qué."
- "Algo que harías si tuvieras un mes libre."
- "La conversación más interesante que tuviste este año."
- "Un lugar al que sueñas con volver."
- "Algo que aprendiste de tu mejor amigo/a."
- "El último libro/serie/película que te marcó."
- "Una habilidad que querrías tener mañana mismo."
- "Tu mañana ideal."
- "Algo que te hace sentir orgulloso/a de ti mismo/a."
- "Un consejo que le darías a tu yo de 18 años."
- "El mejor regalo que has recibido o dado."
- "Una causa por la que te involucras."

### Paso 3 — Fotos privadas (30s)

Sube 3-5 fotos. Quedan **bloqueadas** y no aparecen en el feed de descubrimiento. Solo se desbloquean cuando hay match mutuo después del intercambio de voz.

Razones técnicas para pedirlas en onboarding y no después:
- Asegura que toda cuenta tiene fotos disponibles (evita ghosting post-match).
- Permite verificación de identidad temprana.

### Paso 4 — Verificación de voz (15s)

El usuario graba una frase aleatoria que aparece en pantalla (ej: "hoy es martes y el cielo está despejado"). Se compara con sus prompts grabados usando voice fingerprinting (Resemblyzer o pyannote.audio).

Si coincide: cuenta verificada con badge ✓.
Si no coincide o el sistema duda: revisión manual en panel de moderación dentro de 24h.

## 3. Mecánica del match

### 3.1 Feed de descubrimiento

El feed presenta **un audio a la vez**, en pantalla completa. La interfaz muestra:

- Una visualización de waveform animada (no foto, no nombre).
- Un avatar abstracto de color único que identifica esa persona en la sesión actual.
- El prompt al que está respondiendo.
- Edad (rango: "20s tempranos", "30s tardíos") y distancia aproximada ("a ~5km").
- Tres acciones: skip, save (guardar para escuchar después), responder con voz.

**Algoritmo del feed (v1):**

Score = (afinidad geográfica × 0.3) + (compatibilidad demográfica × 0.4) + (frescura del audio × 0.2) + (engagement histórico × 0.1)

No hay swipe right "vacío". Si te gusta lo que escuchas, **debes responder con voz** (≤60s). Esto fuerza intencionalidad y elimina los matches sin acción.

### 3.2 Match

Match = intercambio mutuo de respuesta de voz. Cuando A responde a B, B recibe la notificación "alguien respondió a tu prompt". Si B también responde de vuelta, hay match.

Una vez en match, se abre la **Chamber**: un canal de mensajes que durante los primeros 3 días **solo permite voz**. Texto bloqueado. Esto fuerza la conversación auténtica y elimina chats fríos de "hola, qué tal".

### 3.3 Desbloqueo de fotos

Después de cualquier momento desde el inicio de la Chamber, cualquiera de los dos puede tocar el botón **"¿quieres ver cómo es?"**. Esto envía una solicitud que el otro debe aceptar.

Si ambos aceptan:
- Las fotos se desbloquean para ambos.
- El chat de texto se habilita.
- Aparece sugerencia de planificar cita.

Si uno declina:
- La Chamber sigue activa, solo voz.
- Se puede volver a solicitar después de 7 días.

### 3.4 Cierre de Chamber

- **Cualquiera puede cerrar** una Chamber en cualquier momento. Cierre = no más mensajes, conversación archivada.
- Después de 14 días sin actividad, la Chamber se archiva automáticamente.
- Una Chamber cerrada no se puede reabrir, pero los usuarios pueden volver a aparecer en el feed del otro después de 30 días.

## 4. Pantallas principales

### 4.1 Discover

Vista por defecto. Pantalla completa con la visualización del audio actual, controles de play/pause grandes, y las tres acciones (skip / save / responder).

Gestos:
- Tap en cualquier parte: play/pause
- Swipe down: skip
- Tap en botón save: guardar
- Tap largo en botón responder: empieza a grabar respuesta

### 4.2 Inbox

Lista de Chambers activas. Cada item:
- Avatar de waveform de la otra persona
- Su prompt principal (el que originó el match)
- Preview del último audio: duración + indicador "no escuchado" si aplica
- Tiempo desde último mensaje

Filtros: todas / no escuchadas / fotos desbloqueadas.

### 4.3 Chamber

Vista de conversación activa. Burbujas de audio con waveform individual, indicador de duración, botón play. Soporte para:
- Transcripción on-demand (toca el audio para ver el texto)
- Reaccionar con emoji
- Indicador "está grabando" en tiempo real (via WebSocket)

### 4.4 My voice

Perfil del usuario. Vista de los 6 prompts grabados con stats:
- Cuántas personas escucharon completo
- Cuántas guardaron
- Cuántas respondieron

Acciones: regrabar prompts, agregar nuevos (hasta 9 totales en plan gratuito, ilimitado en Knot+), editar perfil básico.

### 4.5 Today's prompt

Sección opcional. Cada día aparece un prompt común para todos los usuarios activos. Las respuestas a este prompt forman un mini-feed temático especial, separado del feed principal. Funciona como evento social diario y aumenta retention.

## 5. Modelo de negocio

| Plan | Precio | Beneficios |
|---|---|---|
| Gratis | $0 | 5 audios escuchados/día, 3 respuestas/día, 6 prompts en perfil, 1 Chamber activa |
| Knot+ | $14.99/mes | Audios ilimitados, ver quién guardó tu audio, regrabar ilimitado, 9 prompts en perfil, 5 Chambers |
| Knot Premium | $24.99/mes | Todo Knot+, analytics de tu voz, prioridad en feed, prompts especiales, Chambers ilimitadas |
| Boost | $2.99 (pay-per-use) | Tu último audio sube al top del feed regional por 30 minutos |

Pruebas gratuitas: 7 días de Knot+ al primer signup.

## 6. Funcionalidad técnica clave

### 6.1 Captura de audio

- 48kHz, mono, sin compresión durante grabación.
- Visualización de waveform en tiempo real (60fps).
- Indicador de pico de volumen.
- Auto-stop a los 30s con cuenta regresiva visible los últimos 5s.
- Permite pausa-reanudar dentro del mismo audio.

### 6.2 Procesamiento

Pipeline post-grabación (background job):

1. Validación de duración (1-30s, rechazo bajo 1s).
2. Detección de voz humana (rechaza silencio, ruido pure, música sin voz).
3. Moderación de contenido: transcripción + clasificación con OpenAI moderation API.
4. Voice fingerprint si es la primera grabación del usuario.
5. Transcoding a Opus 32kbps mono.
6. Generación de waveform peaks (audiowaveform CLI, ~200 puntos).
7. Cifrado AES-256-GCM con clave por audio.
8. Subida a S3 con clave en KMS.

### 6.3 Verificación de voz (anti-catfish)

Comparación de voice fingerprint:
- Modelo: pyannote.audio o ECAPA-TDNN.
- Threshold: similaridad coseno >0.75.
- Reverificación: cada vez que el usuario sube fotos nuevas o cambia datos sensibles.

### 6.4 Real-time

WebSocket para:
- "Está grabando..." en una Chamber activa.
- Notificación de match nuevo (sin polling).
- Notificación de "tu audio fue escuchado / guardado / respondido".

### 6.5 Privacidad

- Audios cifrados en reposo, claves rotadas trimestralmente.
- URLs de descarga firmadas, validez 5 minutos.
- Audios borrados completamente al cerrar cuenta + 30 días.
- Posible "panic mode": borrar Chamber y todo el historial con una persona específica con un solo tap.

## 7. Métricas de éxito

KPIs primarios:

| Métrica | Definición | Meta MVP | Meta producto maduro |
|---|---|---|---|
| Listen-through rate | % de audios escuchados completos | 35% | 45% |
| Voice-reply rate | % de audios completos que generan respuesta | 6% | 10% |
| Match-to-meet rate | % de matches que llegan a desbloqueo de fotos | 18% | 30% |
| D7 retention | % activos a los 7 días | 30% | 40% |
| Tiempo a primer match | Mediana horas desde signup | <72h | <24h |
| Voice fingerprint pass rate | % verificaciones automáticas exitosas | 80% | 92% |

KPIs secundarios:

- Conversión a Knot+ (target: 8% MAU)
- NPS (target: 35+)
- Reportes por 1000 sesiones (target: <3)
- Promedio de duración de Chamber activa (target: >7 días)

## 8. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Vergüenza de grabar audio | Onboarding gamificado, ejemplos de "buenos audios", regrabación ilimitada. |
| Calidad pobre de audio en algunos devices | Validación en cliente + en server, mensaje claro al usuario si la grabación es muy ruidosa. |
| Usuarios que solo skipean sin responder | Throttle: después de 50 skips sin respuesta, prompt explicando que la mecánica requiere intención. |
| Catfishing con voz pregrabada | Verificación con frase aleatoria en momentos no predecibles. |
| Discriminación por acento | Política explícita en términos de uso. ML para detectar reportes con sesgo. |
| Audios viralizados/grabados sin consentimiento | Marca de agua inaudible (audio watermarking) en cada audio entregado. |

## 9. Out of scope para MVP

- Llamadas en vivo (post-match)
- Audio en grupos
- Stories/audios temporales (24h)
- Filtros de voz (efectos)
- Integración con servicios de música
- Modo "amigos" (no romántico)
- Versión web nativa de la experiencia (la web del MVP es solo para gestión de cuenta y descubrimiento básico)

Estas se evalúan post-MVP según métricas y feedback.
