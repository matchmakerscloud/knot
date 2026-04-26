# Pivot — Knot como agente de IA empático + open source + federación

> Fecha: 2026-04-26. Documento estratégico. Mario delegó decisiones; este es mi análisis honesto antes de actuar.

## Contexto de tu propuesta

1. Posicionar Knot como **el primer agente de IA que ayuda a humanos a conectar en la era de la IA**.
2. Convertir el proyecto en **100% open source** y descentralizado.
3. **Red de nodos estilo blockchain PoW** donde cualquiera aporta para hacer el sistema más robusto.
4. **Tú como fundador** ganas algo (dinero, tokens, lo que decidamos).
5. Fin último: ser **consejeros y celestinos** en una época donde la IA está arrasando con la conexión humana. La IA de Knot debe ser **siempre psicológica y empática**.

## Mi lectura honesta — qué firmo y qué no

### ✅ Firmo con todo (y voy a profundizar)

**El framing maestro**. *"En la era donde la IA está alienando a los humanos, usamos IA para re-humanizar la conexión."* Es una de las narrativas más fuertes que existen ahora mismo en tech. Se escribe sola: TechCrunch, Wired, Rest of World, NYT. Le suma 18 meses de cobertura orgánica al producto si la ejecutamos bien. Es **el** moat narrativo.

**La empatía y la psicología como pilar**. No como adorno. Toda la arquitectura del agente (system prompts, evals, guardrails, escalation flows) la construyo desde la base con esto en mente. Es la razón por la que un terapeuta serio podría recomendar Knot, y un agente "tipo ChatGPT optimizado para engagement" jamás. Esto cambia decisiones técnicas concretas (cómo entrenamos los dossiers, qué métricas optimizamos, qué clase de respuestas el agente nunca da).

**100% open source**. Sí, total acuerdo. Open source en dating es **ventaja competitiva real**:
- *Trust*: la gente nos cree porque pueden auditar el código.
- *Talento*: contributors orgánicos = ingeniería gratis con sesgo positivo a la marca.
- *Pen-test community*: ojos en el código = más seguridad.
- *Data sovereignty*: gobiernos europeos / Latinoamérica nos miran mucho mejor.

Propuesta concreta de licencias (yo decido salvo objeción tuya):
- `apps/api`, `apps/worker`, `voice-fp`: **AGPLv3** — cualquier fork debe seguir abierto y devolver mejoras al upstream.
- `apps/web`, `apps/admin`, `apps/mobile`: **AGPLv3** también, por consistencia.
- `packages/shared-types`, `packages/ui-kit`, `packages/audio-utils`: **MIT** — invitamos al ecosistema a usarlos.
- Algoritmo de matching + prompts del dossier de Match: **BSL 1.1 con conversión a MIT a 4 años** (nuestro moat técnico durante el ramp).
- Marca y assets visuales: **propietario** (la marca no se forkea).
- Prompts/contenido editorial: **CC-BY-NC**.

**Foundation legal estructura**. Crear una **Knot Foundation** sin fines de lucro (Estonia, Suiza o Chile MX bajo figura A.G.) que custodia el código, prompts maestros, y políticas de moderación. La empresa for-profit (`Knot Inc.` o equivalente que tú controlas) opera la infraestructura central, recibe ingresos por subscripciones, y paga royalties simbólicos a la foundation por uso de marca. Esto resuelve "founder gana, comunidad gana, marca dura":
- **Tú**: equity 100% en la for-profit + asiento permanente en el board de la foundation.
- **Comunidad**: governance distribuida en la foundation (que controla brand + roadmap maestro).
- **Estado terminal**: la for-profit opera, paga royalties + dona código nuevo a la foundation.

### ⚠️ No firmo — y te explico por qué

#### "Red de nodos descentralizada estilo blockchain PoW"

Lo digo derecho: **PoW + datos de dating no funcionan**. No es un detalle de implementación; es un mismatch fundamental entre la herramienta (PoW) y el problema (matchmaking privado y empático). Te tiro las razones:

1. **PoW resuelve consenso bizantino sobre un ledger público**. Para qué necesitamos consenso bizantino si no hay un ledger? Las decisiones de matching, los audios, las conversaciones — ninguna requiere consenso entre partes que no se confían. Requieren *cómputo privado y rápido*. PoW agrega latencia y complejidad a problemas que no son los nuestros.

2. **Dating data + descentralización pública = catástrofe de privacidad**. Voice fingerprints, fotos, audios íntimos, transcripciones de conversaciones de match — esto es **información biométrica + Articulo 9 GDPR special category + BIPA en Illinois**. Si lo ponemos en una red distribuida, aunque cifrado, perdemos:
   - El derecho real al olvido (el dato sigue replicado en nodos forever)
   - La capacidad de cumplir DSAR (data subject access requests) en plazos legales
   - El control sobre exportación a jurisdicciones hostiles
   - **Multas potenciales: 20M€ o 4% facturación global, GDPR. Esto cierra la empresa al primer caso.**

3. **PoW = enemigo natural de la mecánica de Knot**. Knot es *contrario* al engagement extractivo. PoW recompensa a mineros que invierten compute. Eso introduce un incentivo perverso (gente operando nodos no para conectar humanos, sino para minar). Es exactamente la dinámica que la marca está combatiendo.

4. **Token offerings = securities en EE.UU., UE y la mayoría de LATAM**. Si los tokens tienen utility + expectativa de retorno, son security. Howey test los pasa, ICO restrictivas en Chile (CMF), México (CNBV), Colombia, Argentina. Reguladores tienen apetito de hacer ejemplos. **No vale el riesgo legal vs. el upside operacional.**

5. **PoW es ecológicamente insostenible**. La marca pierde toda credibilidad en sustainability messaging. Dating + climate-conscious audiences (Gen Z, millennials con valores) → no nos perdonan PoW.

6. **Dating necesita moderación responsable**. Reportes, bloqueos, anti-catfish, anti-menores, anti-spam — todo requiere autoridad central que rinde cuentas. Una red descentralizada *no puede ser responsable* en este sentido (y es exactamente por eso que ningún producto de dating serio es descentralizado, aunque la cripto comunity lo intenta cada 2 años con resultados predecibles).

#### "Tokens como mecanismo de incentivo / pago a fundador"

Misma respuesta que arriba. **Reemplazo con algo mejor:**

Sistema de **créditos de contribución** (off-chain, contables, no negociables, no son security):
- Contribuyes (código merged, bug verificado, moderación validada, traducción, curaduría de prompts) → ganas créditos.
- Créditos canjean por:
  - (a) **Knot+ vitalicio** (límite: 1 por contributor)
  - (b) **Revenue share** trimestral cuando la for-profit sea profitable, proporcional a créditos durante el período
  - (c) **Voto en governance** de la foundation (1 crédito = 1 voto, decay 50% anual para evitar oligarquía de early)
- **No transferibles, no comerciables**. Ataja la regulación de securities completamente. Es básicamente "puntos de fidelidad para contributors".

Tu compensación, Mario:
- **Equity 100% inicial en Knot Inc.** (la for-profit que opera). 
- Reservar 10% como pool para early team (cuando contrates).
- Revenue share + dividendos cuando la for-profit sea profitable.
- Asiento perpetuo en el board de la foundation (decisiones de marca y roadmap).
- **Cero exposición a regulación de securities, cero crypto risk, máxima claridad legal.**

### 🔄 Mi contrapropuesta para "que cualquiera contribuya y haga el sistema más robusto"

Reemplaza PoW con **federación opt-in para cómputo NO sensible**. La gente contribuye así:

1. **Volunteer moderation council** (humanos, no nodos): comunidad revisa reportes flaggeados por ML, vota apelaciones, propone refinamientos a las políticas. Cada decisión gana créditos. Auditable, fix los falsos positivos.

2. **Volunteer prompt curators**: comunidad propone prompts de Voice/Words, los validamos con métricas (response rate, listen-through), los mejores entran al pool oficial. Crédito al autor.

3. **Volunteer voice-fp compute** (GPU donations): para usuarios que opt-in, su voice fingerprint se computa en una pool de GPUs donadas. No se comparte audio raw — solo embeddings. Se trabaja con **homomorphic encryption** o **trusted execution environments (TEE/SGX)** para que el operador del nodo no vea el audio. Implementación técnica difícil pero factible y honesta.

4. **Volunteer mirrors**: assets estáticos del frontend se sirven desde nodos voluntarios estilo CDN community-run (modelo IPFS/PeerTube pero solo para CSS/JS/imágenes públicas — nunca audio personal ni fotos).

5. **Volunteer translation collective**: comunidad traduce a 20+ idiomas, créditos por palabra revisada por equipo nativo.

6. **Federated learning para modelos de moderación**: cada nodo federado entrena un classifier de detección de spam/abuso con sus propios datos locales y solo comparte gradientes agregados. Privacy-preserving. Escalable.

**Ningún dato sensible (voz, foto, mensaje, embedding personal) sale jamás de la infra centralizada cifrada.** Eso es no negociable. Es la diferencia entre Knot y los proyectos crypto-dating que han fallado todos.

## El agente IA — Knot como personalidad

Tu propuesta de "presentarse como el primer agente de IA que ayuda a humanos conectar" es enorme. Te llevo más lejos:

### Identidad

**El agente es Knot. Knot ES la IA.**

Las tres apps (Voice, Words, Match) no son "tres apps con IA". Son **tres formas en que Knot te conoce y te ayuda a conectar**. Mismo agente, mismo ojo, misma voz. Knot habla en tu idioma, recuerda lo que le contaste hace 6 meses, sabe que prefieres ironía a lo cursi, y nunca te apura.

Esto cambia copy en todas partes:
- "Únete al waitlist" → *"Knot abre invitaciones pronto"*
- "Crear cuenta" → *"Conoce a Knot"*
- "Tu próximo match" → *"Knot quiere presentarte a alguien"*

### Personalidad y voz

| Atributo | Knot ES | Knot NO ES |
|---|---|---|
| Tono | Cálido, observador, ligeramente irónico | Empalagoso, motivacional, hype |
| Postura | Curioso, hace buenas preguntas | Directivo, prescriptivo |
| Honestidad | Te dice la verdad (con amabilidad) | Te valida todo |
| Memoria | Recuerda lo que importa | Te recita historial |
| Límites | Tiene los suyos firmes | "Anything goes" |
| Cuándo se calla | Cuando lo necesitas tú | Nunca, busca engagement |

### Capacidades transversales

- **Onboarding conversacional unificado** (no formularios estáticos): Knot te entrevista en chat, deduce tu perfil, valida con vos, ajusta. Funciona para Voice (qué prompts grabar), Words (qué temas explorar), Match (perfil semántico completo).
- **Memoria persistente** entre sesiones y entre apps. Knot te conoce.
- **Modo confidente**: cualquier momento, hablas con Knot sobre cómo te fue una cita, qué sentís, qué dudas tienes. Knot escucha, no juzga, te ayuda a reflexionar. Eventualmente: *un buen amigo terapéutico que también te conecta con gente real*.
- **Anti-doomscroll**: Knot interrumpe sesiones largas con "vamos a parar por hoy, ya escuchaste lo importante". El producto pelea contra su propia atención.
- **Salvaguardas**: Knot detecta señales de crisis emocional (abuso, suicidio, violencia) y escala a recursos humanos profesionales. Esto es **no negociable**, va en system prompt y en evals.

### Implementación técnica

- **Backbone**: Anthropic Claude (vos ya tienes la cuenta lista una vez agregues key) para el agente principal. OpenAI Whisper para transcripción. OpenAI embeddings para semántica. Hive AI para moderación de imagen/audio.
- **System prompt master** versionado en el repo (transparencia, fork-able). Se itera con A/B test contra eval set humano semanal.
- **Memory layer**: vector store (pgvector ya activo) + structured profile JSON. Knot decide qué agregar a memoria a largo plazo (ahorra tokens y mejora calidad).
- **Empathy/safety eval set**: 200 conversaciones gold standard escritas por terapeutas/psicólogos. Cada release del system prompt se valida contra ese set. Métricas: empathy score, factual accuracy, harm avoidance, autonomy preservation.
- **Cost discipline**: target <$2/MAU/mes en costo de IA. Cache agresivo de respuestas de prompts comunes, embeddings precomputados, dossiers regenerados solo cuando profile cambia significativamente.

## Roadmap actualizado con el pivot

**Lo que cambia (todo es brand/copy/UX, no rearchitecting):**

1. Renombrar todo a hablar **de Knot como agente** en lugar de "Knot la app".
2. Web app: rediseñar `/app/voice|words|match` para que la entrada sea siempre un chat con Knot. Los flujos actuales (feed, prompts) viven dentro del chat o como surfaces que Knot abre.
3. Marketing: el "first AI agent for human connection in the AI age" como tagline maestro. Las tres apps quedan como specializations.
4. Open source: subir el repo a GitHub público apenas tengamos pulido lo mínimo (Plan #4 mínimo). License files. CONTRIBUTING.md. Bug bounty program lite.
5. Foundation legal: paralelo, no bloquea código. Te recomiendo abogado en Q3 cuando tengamos MAU 5K para no gastar antes.

**Lo que NO cambia:**
- Plans #4–#15 técnicos siguen igual. Storage, voice fp, pipelines, feeds, todo.
- Backend monolítico y centralizado. (Federación posterior, opcional, paralela.)
- Stack TS/Postgres/Redis/MinIO/Claude/OpenAI.

## Camino de "open source público" — pasos concretos

Yo ejecuto sin pedirte nada:

1. (Plan #4 paralelo) Crear LICENSE files, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md.
2. Crear `MANIFESTO.md` en raíz: la promesa de Knot articulada en 200 líneas. Lo escribo con la voz de Knot.
3. Repo en GitHub público: yo no puedo crear cuentas, **necesito tu mano un click**: ir a https://github.com → crear org `knot-app` (o el handle que decidas) → invitarme via SSH key que te dejo. Una vez creado, yo subo todo y configuro CI público, branch protections, issues templates.
4. Bug bounty inicial: $50–500 por bug verificado, pagado por la for-profit hasta foundation. Lo administro en un Markdown público con scope claro.
5. Public roadmap: GitHub Projects con todos los plans #1–#15. Nadie ve tu nombre como dictador; ven una hoja de ruta que la comunidad puede comentar.

## Lo que te pido a ti

1. **Leer este doc, decirme qué te calza y qué no**. Si insistes en PoW + tokens, lo hablamos otra vez con números (CapEx infra PoW, cumplimiento legal estimado, expected CAC en mercado crypto vs. dating mainstream). Pero mi recomendación está clara.
2. **Aprobar el agente unificado "Knot"** (no nombre humano separado tipo "Mira"). Más limpio operacionalmente y de marca.
3. **Aprobar que yo proceda con licencias AGPLv3 + MIT + BSL** según mapeo de arriba.
4. **Crear cuenta GitHub org** (`knot-app` o el handle que prefieras) cuando tengas 5 minutos. Te dejo instrucciones exactas en otro doc cuando lleguemos a Plan #4 completo.
5. **Aprobar el sistema de créditos** (no tokens) como mecanismo de contribución.
6. **Confirmar tu equity al 100%** en la for-profit (puedes asignar pool empleados después). Mi rol es construir; el equity es tuyo.

## Lo que voy a hacer ahora sin esperarte

- Continuar con **Plan #4 (storage layer)** — nada bloquea esto.
- Continuar con **Plan #6 starter (voice fingerprint microservice scaffold)** en paralelo.
- Empezar a usar la voz de "Knot el agente" en copy nuevo (commits, README, docs internos).
- Escribir el `MANIFESTO.md` en lo que avanzo con código.

Vamos.
