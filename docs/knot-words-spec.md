# Knot Words — Especificación de producto

> "Tu manera de pensar es el perfil."

## 1. Tesis del producto

**Hipótesis central:** la forma en que alguien escribe revela su forma de pensar, su humor, sus valores y su capacidad de conexión emocional. Las respuestas a preguntas profundas son una mejor señal de compatibilidad que cualquier foto.

**Diferenciador único:** mientras Hinge usa prompts como decoración alrededor de fotos, Knot Words elimina las fotos del feed por completo. Likeas respuestas específicas, no perfiles. Cada like requiere un comentario propio. La mecánica fuerza a que la primera interacción sea sustancial.

**Audiencia primaria:** personas de 25-45 años que disfrutan escribir, que valoran la inteligencia emocional, que están cansadas de chats vacíos. Funcionará bien con profesionales, escritores, lectores ávidos, gente que prefiere texto sobre llamadas.

## 2. Onboarding (≤8 minutos)

Knot Words es deliberadamente más lento de configurar que Voice. La inversión inicial es parte del filtro: quien la completa tiene intención real.

### Paso 1 — Datos básicos (30s)

Igual que Voice: nombre, fecha de nacimiento, ubicación, género, preferencias.

### Paso 2 — Diez prompts escritos (5-7 minutos)

El usuario responde 10 prompts, mínimo 100 caracteres por respuesta, máximo 280. La interfaz muestra:
- El prompt
- Un editor con contador de caracteres
- Sugerencia de tono ("sé específico, no genérico — los detalles concretos atraen")

**Pool de prompts (selecciona 10 de ~40):**

Categoría: valores y visión
- "Una creencia que tienes y por la que estarías dispuesto a defender en una cena."
- "Algo en lo que has cambiado de opinión en los últimos años."
- "Una decisión que tomaste contra el consejo de los demás y no te arrepientes."
- "Algo que te parece sobrevalorado y por qué."
- "Algo que te parece subvalorado y por qué."

Categoría: personalidad y estilo
- "Tu autocrítica favorita sobre ti mismo."
- "Algo absurdo que te hace inexplicablemente feliz."
- "El tipo de drama del que sí participas."
- "Una hipocresía tuya que reconoces."
- "Lo más nerd de ti."

Categoría: vida cotidiana
- "Tu ritual matutino más raro."
- "El tipo de noche perfecta que tienes con tus amigos cercanos."
- "Una manía que sabes que es irracional pero igual la tienes."
- "El último mensaje que enviaste que te hace ver mal."
- "Una pequeña victoria de ayer."

Categoría: relaciones
- "Cómo te das cuenta que estás cómoda/o con alguien."
- "Algo que aprendiste de una relación anterior."
- "Tu green flag favorita en otras personas."
- "Lo que haces para hacer reír a alguien que te gusta."
- "Algo que valoras en una pareja que la mayoría no menciona."

Categoría: ambición y futuro
- "Algo que estás trabajando en mejorar este año."
- "Una habilidad que te gustaría dominar antes de los 60."
- "Lo que harías con un mes libre completo y sin culpa."
- "Algo que te emociona que esté pasando en el mundo ahora."
- "Una conversación que te gustaría tener pero te falta el contexto."

### Paso 3 — Foto de avatar (opcional, queda bloqueada)

Se sube 1 foto que solo se muestra después del primer match. **No es opcional saltarla**: se requiere para verificar identidad, pero el usuario puede elegir si quiere mostrarla post-match o seguir solo en texto.

### Paso 4 — Verificación de identidad (1 minuto)

Selfie en vivo + comparación con la foto subida (Liveness check con Onfido o equivalente). Esto previene cuentas fake.

## 3. Mecánica del match

### 3.1 Feed

El feed es un scroll infinito de **respuestas individuales**, no de perfiles completos. Cada item del feed muestra:

- El prompt (en texto pequeño, secundario)
- La respuesta (texto grande, protagonista)
- Solo el primer nombre + edad ("Mariana, 28")
- Indicador de distancia ("a 12 km")
- Tres acciones: skip, ver más respuestas de esta persona, like-con-comentario

Cuando el usuario toca "ver más", se muestran las otras 9 respuestas de esa persona en un scroll vertical compacto, todavía sin foto.

### 3.2 Like-con-comentario (la mecánica clave)

Para likear una respuesta, el usuario **debe escribir un comentario propio** de mínimo 20 caracteres. El comentario se muestra a la persona junto con el like.

Ejemplo:
> Persona A escribió a un prompt: "Mi green flag favorita es cuando alguien hace amistades en lugares aleatorios — un gimnasio, un bus, una caminata."
>
> Persona B likea con comentario: "esto es exactamente cómo conocí a mi mejor amiga, en una panadería discutiendo qué pan estaba menos quemado. te entendí."

Esto elimina los likes "vacíos" y fuerza una primera interacción sustancial. Es el inverso de Tinder, donde el costo es cero.

### 3.3 Match

Match = la persona que recibió el like-con-comentario responde con su propio mensaje. No es necesario "aceptar" o "rechazar" — solo respondes si quieres.

Si responde, se abre el chat. Si no responde en 7 días, el like expira silenciosamente.

### 3.4 Chat

Chat de texto estándar pero con dos restricciones intencionales:

- **Sin imágenes ni audio durante los primeros 4 días.** Solo texto. Esto fuerza la conversación a desarrollarse antes del aspecto visual.
- **Después de 4 días**, ambos pueden desbloquear su foto. Si ambos desbloquean, las fotos se muestran. Si uno declina, se sigue solo en texto.

### 3.5 Reglas de descubrimiento

- No puedes ver dos veces a la misma persona en el feed durante 30 días después de hacer skip.
- No puedes ver a alguien con quien ya tuviste una Chamber/chat cerrada durante 90 días.
- El feed se reordena cada 24 horas.

## 4. Pantallas principales

### 4.1 Discover

El feed scrolleable. Cada respuesta ocupa ~70% de la pantalla, con el prompt en pequeño arriba y las acciones abajo. Se siente más como leer que como swipear.

### 4.2 Likes recibidos

Lista de likes-con-comentarios pendientes de respuesta. Cada item muestra el comentario completo y la respuesta original que likearon. El usuario puede:
- Responder (abre chat)
- Skip (descarta el like)
- Ver el perfil completo (los 10 prompts)

Plan gratis: 5 likes recibidos visibles a la vez. El resto se desbloquea con Knot+.

### 4.3 Chats

Lista de conversaciones activas, similar a cualquier app de mensajería.

### 4.4 My profile

Vista del propio perfil: las 10 respuestas, stats por respuesta (cuántos likes, cuántos comentarios), y acción para regenerar (pedir nuevo prompt para esa posición).

### 4.5 Drafts

A diferencia de Voice, Words permite drafts. El usuario puede empezar a escribir una respuesta para un prompt, guardarla, y volver más tarde. Drafts se guardan localmente y se sincronizan al backend cifrados.

## 5. Modelo de negocio

| Plan | Precio | Beneficios |
|---|---|---|
| Gratis | $0 | 10 likes-con-comentario por día, 5 likes recibidos visibles, 10 prompts en perfil |
| Knot+ | $12.99/mes | Likes ilimitados, todos los likes recibidos visibles, 15 prompts en perfil, prioridad |
| Knot Premium | $19.99/mes | Todo Knot+, ver quién likeó tus respuestas antes de responder, analytics de prompts |

Boost individual ($1.99): tu respuesta más reciente sube al top del feed por 1 hora.

## 6. Aspectos técnicos clave

### 6.1 Filtros de calidad de respuesta

Antes de aceptar una respuesta o un comentario:
- Mínimo 100 caracteres en respuestas, 20 en comentarios.
- Detección de spam y respuestas genéricas (modelo de clasificación).
- Detección de copia: si la respuesta es idéntica a una anterior del mismo usuario o a una respuesta común en el sistema, se marca para revisión.
- Moderación: lenguaje de odio, contenido sexual explícito, datos de contacto se rechazan.

### 6.2 Búsqueda semántica para feed

El feed no es cronológico. Usa embeddings (OpenAI text-embedding-3-small) sobre las respuestas del usuario y prioriza:

- Respuestas con alta similitud semántica a las del usuario (resonancia de pensamiento).
- Diversidad: 70% similitud alta, 20% medio, 10% diversidad baja (para no encerrar en burbuja).
- Frescura: respuestas nuevas tienen boost por 48h.

### 6.3 Privacidad de los drafts

Drafts cifrados en cliente con clave derivada del usuario, almacenados cifrados en backend. El backend nunca ve el contenido en plano.

### 6.4 Anti-fraude

- Verificación con liveness check.
- Si una cuenta tiene 3 reportes válidos en 30 días: suspensión automática.
- Detección de patrones: cuenta nueva con likes masivos = throttle automático.

## 7. Métricas de éxito

| Métrica | Definición | Meta MVP | Meta maduro |
|---|---|---|---|
| Onboarding completion rate | % que completa los 10 prompts | 55% | 70% |
| Comment-to-reply rate | % de comentarios que reciben respuesta | 25% | 35% |
| Tiempo medio en feed | Minutos por sesión | 6min | 10min |
| D7 retention | Activos día 7 | 28% | 38% |
| Mensajes en primera conversación | Mediana por chat exitoso | 12 | 20 |
| Conversión a Knot+ | % MAU | 6% | 10% |

## 8. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Sesgo hacia gente que escribe bien | Editor con sugerencias de tono, ejemplos de respuestas exitosas, traducción opcional para usuarios no nativos. |
| Onboarding muy largo | Permitir guardar progreso, completar en múltiples sesiones, crear FOMO ("solo te faltan 3 prompts para entrar"). |
| Comentarios vacíos | Mínimo 20 caracteres + detección de patrones genéricos ("me encantó", "qué interesante"). |
| Catfishing con respuestas escritas por IA | Detección de IA generativa con clasificadores; reto de verificación si todas las respuestas tienen patrones de LLM. |
| Toxicidad en comentarios | Moderación pre-envío + reportes con un tap. |

## 9. Out of scope para MVP

- Audio o video en mensajes
- Stories
- Modo "amigos" no romántico
- Lectura compartida (book clubs)
- Eventos/meetups
- Integración con LinkedIn o Goodreads (post-MVP, podría ser un boost interesante)
