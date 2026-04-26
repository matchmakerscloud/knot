# Knot Match — Especificación de producto

> "Un agente que conoce a ambos."

## 1. Tesis del producto

**Hipótesis central:** el dating moderno es trabajo emocional invisible. Los usuarios consumen su atención, su tiempo y su capacidad de juicio en filtrar cientos de perfiles. Una IA bien construida puede hacer ese trabajo mejor: entender qué buscas, conocer a tu posible pareja igual de bien, y presentarte solo personas con alta probabilidad de conexión.

**Diferenciador único:** no es una app con "matching mejorado". Es una app **sin feed**. No hay swipe, no hay scroll infinito, no hay decisiones constantes. Una IA conversa contigo, te entiende, y luego, una o dos veces por semana, te presenta a alguien con un dossier explicando el porqué.

**Audiencia primaria:** profesionales ocupados de 28-45 años, personas que valoran la calidad sobre la cantidad, exhaustos de las apps tradicionales, dispuestos a pagar por una experiencia premium con menor fricción. Esta es la app más cara del trío y la que apunta a la audiencia de mayor poder adquisitivo.

## 2. Onboarding (semana 1 — conversacional)

A diferencia de Voice y Words, el onboarding de Match no es una lista de pasos en una sola sesión. Es **una conversación con la IA durante 5-7 días**, con sesiones cortas (10-15 min) cada día.

### Día 0 — Datos básicos y consentimiento (5 min)

Datos típicos + explicación clara de qué hace la IA, cómo usa los datos, opt-in explícito para que la IA tome notas y construya un perfil semántico.

### Día 1 — Lo que buscas (15 min)

La IA conversa sobre qué busca el usuario en una pareja. No es una lista de checkboxes. Preguntas como:

- "Cuéntame de la última relación que te hizo crecer como persona, sea pareja o amistad."
- "Cuando piensas en estar con alguien dentro de 5 años, ¿qué están haciendo en una tarde cualquiera?"
- "¿Qué tipo de discusiones te ayudan a entender mejor a alguien?"

La IA hace seguimiento, repregunta, profundiza. No es un formulario disfrazado.

### Día 2 — Tu vida cotidiana (15 min)

Cómo es tu día normal, qué disfrutas, qué evitas, ritmos de vida, hobbies, relación con el trabajo, cómo te relajas.

### Día 3 — Valores y red flags (15 min)

Valores no negociables, deal breakers, qué tipo de actitudes/comportamientos te alejan de inmediato, qué te enamora.

### Día 4 — Tu historia (10 min)

Tu trayectoria emocional. No es terapia, pero la IA quiere entender qué traes. Relaciones importantes pasadas (sin pedir nombres ni detalles), lo que aprendiste, lo que estás cuidando ahora.

### Día 5 — Tu mejor versión (10 min)

Cómo te describirías sin ser modesto. Qué te diferencia. Qué dirían tus amigos cercanos sobre ti. Esto se convierte en parte del dossier que verán otros.

### Día 6 — Confirmación y ajustes (5 min)

La IA te muestra un resumen de cómo te entendió: tres párrafos sobre quién eres, qué buscas, qué tipo de persona podría conectar contigo. El usuario puede corregir, agregar matices, eliminar cosas.

### Día 7 — Verificación de identidad y primera vista

Verificación con selfie + documento. Después, la IA muestra al usuario su primer match dentro de 48-72 horas.

## 3. Mecánica del match

### 3.1 Generación del perfil semántico

A partir de la conversación de la semana, se generan:

- **Resumen estructurado** (estilo JSON con campos como valores, hobbies, ritmos, deal breakers).
- **Embeddings vectoriales** de cada respuesta importante (modelo: text-embedding-3-large).
- **Perfil narrativo** (3 párrafos) escrito por Claude — esto es lo que verán otros usuarios.
- **Evaluación de fit** (vector aprendido sobre qué tipo de personas le hacen click al usuario).

### 3.2 Algoritmo de matching

Cada 24 horas, para cada usuario activo, el sistema:

1. Filtra el universo de candidatos por hard constraints: ubicación, rango de edad, género preferido, deal breakers explícitos.
2. Calcula un score combinado:
   - **Compatibilidad de valores** (40%): similitud entre valores declarados.
   - **Resonancia conversacional** (30%): similitud entre cómo escriben/se expresan.
   - **Complementariedad de estilo** (20%): no idénticos, sino que encajen — energía similar pero ángulos distintos.
   - **Logística** (10%): distancia razonable, disponibilidad temporal compatible.
3. Selecciona el top 3 candidatos.
4. Por cada uno, Claude genera un dossier explicando por qué este match podría funcionar.
5. El equipo de moderación revisa el top dossier antes de presentarlo (en MVP; automatizar después).

### 3.3 Presentación del match

Una o dos veces por semana, el usuario recibe una notificación: *"Te presento a alguien."*

Al abrir, ve un **dossier** con:

- Primer nombre, edad, ubicación aproximada
- Foto (única, sin galería)
- Tres párrafos descriptivos generados por Claude:
  - Quién es ella/él
  - Qué tienen en común
  - Qué podría hacer la conexión interesante (no solo lo común, también las diferencias generativas)
- Tres "puntos de partida": preguntas o temas sugeridos para abrir la conversación, basados en intereses comunes específicos.
- Dos botones: **"Conocer"** o **"Pasar"**.

### 3.4 Cuando ambos eligen "Conocer"

Se abre un canal de chat con un mensaje inaugural de la IA:

> "Hola Mariana y Tomás. Los presento porque ambos hablaron de cómo aprenden mejor escuchando perspectivas distintas a las suyas, y porque ambos describieron que valoran a alguien que pregunta de verdad. Aquí tres temas para empezar: [...]. Cuando quieran que me retire del chat, díganlo."

La IA permanece como observadora silenciosa los primeros días. Si el chat se traba (3 días sin mensajes), interviene con una sugerencia gentil: *"¿Quieren que les sugiera algo para retomar?"*. El usuario puede pedir que la IA salga en cualquier momento.

### 3.5 Feedback loop

Después de cada match (haya funcionado o no), el usuario recibe una mini-encuesta:

- ¿Qué tan acertado fue el match? (1-5)
- ¿Qué te gustó del dossier? ¿Qué le erró?
- ¿Quieres que probemos otro perfil similar o distinto?

Este feedback alimenta el modelo de fit personal del usuario.

## 4. Pantallas principales

### 4.1 Today (vista principal)

La pantalla por defecto no es un feed. Es una vista que muestra:

- Si hay un match nuevo: el dossier, prominente.
- Si no: estado claro ("estamos buscando para ti, te avisamos cuando encontremos a alguien"), última actualización ("revisamos 47 perfiles esta semana"), tip o reflexión del día de la IA.

### 4.2 Conversation with the AI

Acceso permanente al chat con la IA matchmaker. El usuario puede:
- Pedirle que ajuste lo que busca
- Compartir reflexiones después de un match
- Hacer preguntas ("¿por qué no me has presentado a más gente esta semana?")
- Refinar deal breakers

### 4.3 Active matches

Lista de chats activos con personas presentadas. Máximo 3 simultáneos en plan estándar (configurable hacia arriba en Premium).

### 4.4 Past matches

Historial de presentaciones pasadas, con outcome. Útil para que la IA aprenda y para que el usuario reflexione.

### 4.5 My profile

El perfil narrativo que verán otros, editable con ayuda de la IA. Foto principal. Configuración de notificaciones.

## 5. Modelo de negocio

Match es premium-only. No hay tier gratuito.

| Plan | Precio | Beneficios |
|---|---|---|
| Match Standard | $39.99/mes | 1 match/semana, hasta 3 chats activos |
| Match Plus | $69.99/mes | 2 matches/semana, hasta 5 chats activos, prioridad en revisión humana |
| Match Concierge | $199/mes | Matchmaker humano + IA, hasta 4 matches/semana, sesiones 1-1 mensuales con coach de relaciones |

Razones para no tener tier gratuito:
- El costo computacional por usuario (LLM, embeddings, revisión humana) es alto.
- La promesa del producto es calidad y curaduría — un tier gratuito devalúa la marca.
- La audiencia objetivo está dispuesta a pagar por evitar el dolor del dating tradicional.

## 6. Aspectos técnicos clave

### 6.1 LLM ops

- **Modelo principal:** Claude (Sonnet o el más reciente Opus para casos críticos).
- **Modelo de embeddings:** text-embedding-3-large.
- **Cache agresivo:** los perfiles narrativos se generan una sola vez, se actualizan solo cuando cambian datos.
- **Costos:** target <$3/mes por usuario activo en costos de IA. Modelo de negocio compatible.
- **Eval framework:** evaluamos la calidad de los dossiers en un set rotativo de 100 perfiles cada semana.

### 6.2 Privacidad de las conversaciones de onboarding

- Toda conversación con la IA durante onboarding cifrada en reposo.
- El usuario tiene derecho a ver/exportar/eliminar el perfil semántico generado.
- Datos no se usan para entrenar modelos generales (acuerdo contractual con OpenAI/Anthropic vía Zero Data Retention).

### 6.3 Revisión humana en el loop (MVP)

En el MVP, cada dossier antes de mostrarse al usuario pasa por un humano (equipo interno). Esto:
- Detecta errores graves del LLM.
- Construye dataset de calidad para refinar el modelo.
- Permite intervención si hay riesgo (ej: dossier que romantiza algo problemático).

Meta: reducir revisión humana al 20% de los casos en 6 meses, mantener al menos 5% siempre como auditoría.

### 6.4 Anti-fraude

- Verificación de identidad obligatoria antes de la primera presentación.
- Cross-check entre el perfil narrativo (escrito) y la voz/video durante onboarding.
- Detección de respuestas escritas por IA durante la conversación de onboarding.

### 6.5 Vector storage

- pgvector para producción (PostgreSQL con extensión).
- Pinecone como alternativa si volumen lo requiere.

## 7. Métricas de éxito

| Métrica | Definición | Meta MVP | Meta maduro |
|---|---|---|---|
| Onboarding completion rate | % que completa los 7 días | 65% | 80% |
| Match-to-meet rate | % de matches que se conocen en persona | 30% | 45% |
| Dossier accuracy | Promedio de rating del dossier (1-5) | 3.8 | 4.4 |
| D30 retention | Activos día 30 | 50% | 65% |
| Tiempo a primer date | Días desde primer match a primer encuentro | <14 días | <10 días |
| Churn mensual | % cancelaciones | <8% | <4% |
| NPS | Net promoter score | 45 | 65 |

## 8. Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| LLM da dossier incorrecto, ofensivo o sesgado | Revisión humana en MVP, eval framework, guardrails explícitos en system prompts. |
| Usuarios no quieren que la IA "decida por ellos" | Dejar claro que la IA presenta opciones, el usuario decide. Botón visible "ver más opciones" si quiere. |
| Privacidad: la conversación íntima con la IA es muy personal | Comunicación clara, cifrado, derecho a borrado, política de Zero Data Retention con proveedores. |
| Costo computacional alto | Cache, modelos más chicos cuando posible, embeddings precomputados. |
| Lentitud de matching frustra | UX que comunica el ritmo desde día 0 ("una vez por semana, no más"). |
| Sesgo del modelo perpetúa estereotipos | Auditoría regular de los matches por género, raza, edad, orientación. Feedback loops correctivos. |
| Los matchmakers humanos no escalan | El plan Concierge es deliberadamente caro y limitado. |

## 9. Out of scope para MVP

- Modo "encuentros grupales" (cenas curadas tipo Dinner with Strangers).
- Eventos/experiencias compartidas.
- Integración con calendarios para coordinar primera cita automáticamente.
- Coaching de citas pre-encuentro (post-MVP, plan Concierge).
- Análisis post-cita ("¿cómo fue?").
- Versión empresarial para co-living spaces, retiros, etc.
