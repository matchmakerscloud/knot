# Knot — Plan de éxito (GTM + brand + producto)

> Documento vivo. Lo edito conforme avanzamos. Este es **el plan honesto**: separa lo que puedo ejecutar yo de lo que requiere tu mano humana (cuentas reales, pagos, decisiones legales).

## 0. Capacity check honesto

| Lo que YO puedo hacer | Lo que requiere tu mano |
|---|---|
| Código + infra + DNS + nginx + SSL | Aceptar Términos legales (App Store, Twilio, Resend, Stripe, Onfido, Hive, OpenAI/Anthropic billing) |
| Diseño de landings + copy + brand voice | Crear cuentas en redes sociales (CAPTCHA + SMS verify) |
| Drafts de posts, calendarios editoriales, threads, scripts de TikTok/Reels | Postear bajo identidad de marca (los servicios bloquean automatización agresiva) |
| ASO drafts (App Store Optimization): título, subtítulo, keywords, descripción, screenshots brief | Subir a App Store Connect ($99/año) y Google Play Console ($25 una vez) |
| CAC/LTV models + creative drafts para Meta/Google Ads | Cargar tarjeta + autorizar ad spend |
| Brief de fotografía/video para creators | Contratar creators / negociar tarifas |
| Email sequences (Resend templates) + flujos de waitlist | Aprobar dominio en Resend (verificación DNS — eso sí lo hago) y autorizar billing |
| PR list + pitch drafts | Hacer las llamadas / responder periodistas |
| Métricas + dashboards + experimentation framework | Decisiones de pivote que afecten estrategia |

**Regla operacional:** te entrego cada artefacto en `/home/feres/knot/docs/superpowers/...` con instrucciones de "click aquí, pega acá, autoriza esto". Si yo puedo configurarlo end-to-end, lo hago. Si requiere consentimiento humano, te lo dejo a un click.

## 1. Brand & posicionamiento

### Naming canon
- **Marca paraguas:** Knot — minúsculas en logotipo, `Knot` con K mayúscula en texto.
- **Apps:** `Knot Voice`, `Knot Words`, `Knot Match`.
- **Tagline maestro:** *"El dating no se ve, se siente."*
- **Anti-tagline (lo que NO somos):** "no es Tinder con audio", "no es Hinge con prompts", "no es una app de matching mejorado".

### Voz de marca
- Cálida, directa, intelectualmente honesta. Cero corporate. Algo de poesía sin volverse cursi.
- Inspiraciones tonales: *Aldous Huxley en escribir cartas*, *Lin-Manuel Miranda explicando un sentimiento*, *Hinge cuando estaba bien al inicio*.
- **Anti-voz:** "swipe", "hottest matches", "find love today", emojis fueguito.

### Paleta + tipografía (lo que ya está en producción)
- Fondo `#0e0d12` (casi negro warm), tinta `#f5f3ee` (off-white), acento `#c9b6ff` (lavanda apagado).
- Tipografía: serif para títulos, sans-serif para metadata y CTAs. Ya implementado en las landings.

### Dominios — decididos y configurados
- `matchmakers.cloud` ← paraguas + Voice + Words + apps técnicas (api/app/admin)
- `matchmaking.cloud` ← Knot Match standalone (calza linguísticamente con el producto)
- Subdominios mapeados en `/home/feres/knot/docs/superpowers/success-plan/subdomain-map.md` (lo escribo aparte).

## 2. Producto — diferenciadores defendibles

| App | Moat técnico | Moat experiencial |
|---|---|---|
| Voice | Voice fingerprinting (anti-catfish), pipeline de audio premium (48kHz captura → Opus 32kbps entrega) | Mecánica "responde con voz o no haces nada" elimina el lurking |
| Words | Embeddings semánticos para feed (no cronológico), drafts cifrados E2E | Like-con-comentario obligatorio = costo no-cero por interacción |
| Match | LLM ops disciplinada (Claude para dossiers, eval framework semanal) | Sin feed = sin scroll-fatigue. La IA conversa una semana antes del primer match |

**Comparable defensivo:** estas tres mecánicas no se replican copy-pasting features. Cada una requiere conviction de equipo + producto + algoritmo. Es el mejor moat que se puede pedir en una categoría no-network-effects-pura como dating.

## 3. Estrategia go-to-market — 4 fases

### Fase A: Waitlist público + warm pre-launch (semanas 1–6)

**Goal:** 5,000 emails en waitlist, 80% en es-CL/es-MX/es-AR, antes de abrir la app.

**Tácticas:**
- Landing pages ya en aire en `matchmakers.cloud`, `voice.matchmakers.cloud`, `words.matchmakers.cloud`, `matchmaking.cloud`. Próximo paso: **convertirlas a páginas con captura de email** (yo lo hago — Plan de implementación #14, post-Auth).
- Email confirmation + 6-email drip explicando filosofía de Knot (yo escribo, tú apruebas en Resend).
- Twitter/X + Threads + LinkedIn de fundador (Mario): 3 posts/semana, 1 hilo largo/2 semanas. **Yo redacto, tú publicas.**
- 1 podcast de fundador grabado al mes, distribuido por las apps como audio-prompt del día (genial loop de marketing nativo: el podcast vive dentro del producto).

**KPIs Fase A:**
- Waitlist signups: target 5,000 (stretch 12,000)
- Cost per signup orgánico: <$0.30
- Email open rate: >55% (ratio de gente realmente interesada)

### Fase B: Beta cerrada en Knot Voice (semanas 7–10)

**Goal:** 500 usuarios activos en Knot Voice, retention D7 ≥30%.

**Tácticas:**
- TestFlight (iOS) + Internal Testing (Android). Yo armo screenshots + descripción + ASO; **tú creas Apple Developer + Google Play accounts y subes los builds**.
- Invitaciones por cohortes geográficas: Santiago, CDMX, Buenos Aires, Madrid. Saturar mercados pequeños primero (densidad > volumen total — clave en dating).
- Onboarding video de 90s embebido en email de invitación. Yo lo escribo (script + storyboard); **necesitas grabar voz/contratar VO**.
- Programa de "Voice Ambassadors": 30 usuarios early-adopter con beneficios premium 6 meses gratis. Yo armo sistema; **tú validas la lista final**.

**KPIs Fase B:**
- Listen-through rate: ≥35% (target spec)
- Voice-reply rate: ≥6%
- D7 retention: ≥30%
- Tiempo a primer match: <72h
- NPS al día 14: ≥35

### Fase C: Launch público de Voice + soft launch Words (semanas 11–14)

**Goal:** 25,000 MAU en Voice, 5,000 en Words.

**Tácticas:**
- App Store launch oficial. PR pitch a Wired, The Verge, Rest of World, La Tercera, El Tiempo, Animal Político (es-LATAM tech press). Yo redacto pitches; **tú haces follow-up humano**.
- Paid acquisition: Meta Ads ($30/día test, ramp a $300/día si CPI<$3.50). TikTok Ads orgánico-style (UGC creators). Yo entrego creative briefs + 12 variantes de copy/visual; **tú apruebas y pagas**.
- Programa de creators: 30 micro-influencers (10K–100K followers) en LATAM. **Tú negocia**, yo armo brief, tracking, contracts template.

**KPIs Fase C:**
- MAU Voice: 25K (stretch 50K)
- MAU Words: 5K
- Conversión a Knot+: >5% MAU
- CAC pagado blended: <$8

### Fase D: Match launch + escalamiento (semanas 15+)

Match es premium-only ($39/mes mínimo). Launch separado, audience claramente distinta (28–45, busy professionals).

**Tácticas:**
- Distribución por canales B2B-ish: LinkedIn Ads, podcasts de productividad/relaciones, asociación con coliving spaces y co-working premium.
- Partnership con un terapeuta/coach reconocido como "ambassador científico" del enfoque IA-assisted. **Tú negocias**, yo redacto contrato + posicionamiento.
- Lanzamiento internacional escalonado: México → España → Argentina → Brasil (en pt-BR) → US (en es + en).

## 4. Canales de adquisición — modelo CAC/LTV inicial

**Asunción base:** ARPU mensual blended $4 (mix de free + Knot+ + Premium); LTV 9 meses → $36 LTV unitario; target CAC <$10 para mantener LTV/CAC ≥3.

| Canal | CAC esperado | Volumen mensual posible | Notas |
|---|---|---|---|
| Orgánico (waitlist→app) | $0–1 | 8K–15K MAU | Camino más rentable; todo el trabajo es contenido |
| Meta Ads (IG/FB) | $4–8 | 20K–60K MAU | Validar mercado-creative fit primero |
| TikTok Ads (UGC creators style) | $3–6 | 15K–40K MAU | Mejor para Voice (formato afín al producto) |
| Google App Campaigns | $5–10 | 8K–25K MAU | Bid floor alto, mejor cuando ASO ya está optimizado |
| Influencers LATAM (CPM-based) | $6–12 | 5K–15K MAU | Mejor calidad de usuario, peor escalabilidad |
| PR + earned | $0 (incremental) | spike no recurrente | 1–2 por trimestre, no apostar a esto |

**Yo entrego:** creative briefs + copy + 24 variantes de ad iniciales por mes + dashboard de attribution (BigQuery + GA4 + un Looker Studio simple). **Tú entregas:** budget + aprobación de creatives + relación con creators.

## 5. Producto-led growth loops a construir

Cada loop convierte uso del producto en nueva adquisición. Estos van CODEADOS, no son marketing externo.

1. **Voice → "Today's prompt" como contenido público.** Cada día, un prompt común. Las mejores 5 respuestas (anonimizadas y con consentimiento explícito) se publican como mini-podcast en RSS público + Apple Podcasts. Cada respuesta tiene "Conoce a quien dijo esto, descarga Knot Voice → matchmakers.cloud/voice".

2. **Words → "Quote of the week" en Twitter.** Una respuesta destacada se vuelve un quote-card automático posteado al feed @knotapp. CTA: "esta es la persona que escribió esto. Es real. Está en Knot Words."

3. **Match → testimonios en formato dossier.** Parejas que matchearon vía Match, después de 6+ meses, escriben un "dossier de cómo nos conocimos" para el blog. Funciona como Hinge "We met". Yo armo el formato + system de submission.

4. **Cross-app referral.** Si tienes Voice activo, te ofrecen Words gratis por 30 días. Si llevas 3 matches sin éxito en Voice/Words, se sugiere upgrade a Match con descuento de 50% el primer mes.

5. **Voice "fingerprint passport" portable.** Tu voice fingerprint te da credibilidad para verificar identidad en otros contextos (potencial moat: en futuro podríamos vender este servicio a otros que necesiten anti-catfish). Aspiracional, no MVP.

## 6. Producto: backlog de "delights" para diferenciación

Cosas pequeñas pero memorables que la gente cuenta:
- **"Slow App"-style notification timing.** No te notificamos al instante. Match nuevo en Voice: notificación llega entre 18:00–22:00 hora local del usuario. La gente está más receptiva ahí.
- **Audio waveform como tu identidad visual.** En Voice, antes de match, tu "avatar" es la animación de tu propia waveform. Cada usuario tiene una visual única generada de su voz. Imposible copiarse.
- **"Cocoon mode" en Match.** Cuando aceptas una presentación, los primeros 3 días la app esconde toda otra notificación o número de matches potenciales. Te enfocas. Es un setting, no default.
- **Email de aniversario.** Si dos personas matchean y siguen activas 6 meses, ambas reciben un email con el dossier completo de su match (incluyendo el "common ground" y "generative difference" originales). Conversión emocional brutal.
- **No leaderboards. No counters. No "X gente vio tu perfil hoy".** Resistir la tentación de gamification superficial. Si hay engagement metric visible, es el listen-through-rate del audio (medible, justo, alineado con calidad).

## 7. Compliance + safety = parte de la marca

No los enterramos en un footer. Son artículos de portada.

- **Privacy promise pública.** Una página /privacidad-promesa redactada en lenguaje humano. Yo la escribo, tú la firmas (literalmente, con tu nombre).
- **Reportar 1-tap + transparencia.** Cada cuarto, publicamos un "trust & safety report" con números crudos: cuántos reportes, % accionados, % falsos positivos, tiempo medio de respuesta. Yo armo el formato; **tú apruebas la publicación trimestral**.
- **Inclusion statement no-genérico.** Desde día 1: opciones de género no-binarias completas, queer-affirming copy, no asunciones cis-het. Hay mercado underserved aquí, especialmente en LATAM.

## 8. Métricas + experimentation framework

**Dashboards obligatorios desde día 1:**
- Funnel de waitlist → signup → activación (yo lo armo en Looker Studio gratis)
- KPIs spec por app (listen-through rate, comment-to-reply, dossier accuracy)
- Cohorts de retention D1/D7/D30/D90
- Revenue: ARPU, conversion to Knot+, churn, MRR
- LLM costs por usuario activo (target <$3/mes en Match)

**Experimentation:**
- Feature flags ya están en spec (`feature_flags` table). Yo armo el wrapper en backend y un flag-eval en clientes.
- Cualquier cambio significativo en mecánicas pasa por A/B test mínimo 2 semanas + 5,000 usuarios por bucket. No releases por intuición.

## 9. Roadmap operacional — primeras 6 semanas

| Semana | Yo entrego | Tú apruebas/ejecutas |
|---|---|---|
| 1 | Auth module shipped (Plan #1) + waitlist landings + email capture | Conectar dominio en Resend, autorizar billing |
| 2 | Voice fingerprint microservice + storage layer | Decidir vendor: AWS S3 vs Cloudflare R2 (yo recomiendo R2: cero egress) |
| 3 | Voice recording pipeline + onboarding API | Apple Developer + Google Play accounts; bootstrap legal entity si no existe |
| 4 | Voice mobile onboarding (Expo) | Test en device propio; aprobar visual final |
| 5 | Voice feed + reply + match | Identificar 30 beta testers (amigos cercanos, primer círculo) |
| 6 | Voice photo unlock + reports + chambers | Distribuir TestFlight builds; primer waitlist email "ya casi" |

## 10. Lo que NO vamos a hacer (tan importante como lo que sí)

- **No vamos a copiar features de Tinder/Bumble/Hinge.** Si una mecánica ya existe en otra app, la implementamos solo si es esencial al loop de Knot. Sin "stories", "rosas", "premium boost the photo", swipe-anything.
- **No publicamos métricas de vanidad** (descargas, impressions). Solo retention y match quality. Si Tech Crunch pide "número de descargas", redirigimos.
- **No hacemos growth hacks que rompen UX.** Sin "compartir para desbloquear", sin spam de contactos, sin notificaciones falsas tipo "alguien te likeó" cuando no es cierto.
- **No vamos a apurar Match.** Es el producto que más fácilmente se autodestruye con malas presentaciones. Lanzamos solo cuando dossier accuracy ≥4.0/5 sostenido.
- **No competimos en App Store con anuncios de productos invasivos.** Cero "spy on your partner", "find affairs", "secret dating". Curaduría antes que escalamiento.

## 11. Lo que necesito de ti — checklist actionable

Lista priorizada. Cada item te toma <15 minutos a menos que diga otra cosa.

### Esta semana (semana 1):
- [ ] **Confirmar email canónico de marca.** Sugiero `hello@matchmakers.cloud`. Si lo apruebas, configuro Resend + DNS.
- [ ] **Decidir si quieres Cloudflare R2 (recomendación) o AWS S3.** R2 ahorra ~$200/mes en egress a partir de 50K MAU.
- [ ] **Crear cuenta en Resend** y darme acceso (te dejo paso a paso).
- [ ] **Decidir nombre de la entidad legal** (si aún no existe). Importante para App Store accounts.

### Semanas 2–3:
- [ ] Apple Developer Program ($99/año) — solo tu firma + tarjeta.
- [ ] Google Play Console ($25 una vez).
- [ ] Cuentas en Twilio (SMS verify), Onfido (identity), OpenAI, Anthropic (ya tienes acceso?), Hive AI (moderación).
- [ ] Cuenta en Sentry (free tier ok hasta 50K events/mes).

### Antes de Fase B (semanas 7–8):
- [ ] Cuentas oficiales en Twitter/X (@knotapp), Instagram, TikTok, LinkedIn. **Yo redacto bios, tú haces signup**.
- [ ] Decidir budget mensual de paid acquisition.
- [ ] Contratar (o tú mismo grabar) voz para video onboarding.

### Antes de launch público (semana 11):
- [ ] Revisar T&Cs y privacidad finales con un abogado (importante en dating, especialmente con datos biométricos como voice fingerprint).
- [ ] Aprobar lista final de PR targets.

## 12. Riesgos honestos que veo

1. **Cold start en dating.** Sin densidad de usuarios, ningún producto de dating funciona. Saturar 1 ciudad antes de expandir es no-negociable. Si abrimos "global" del día 1, fallamos.
2. **Voice fingerprinting es legalmente delicado.** Datos biométricos = GDPR especial protection, BIPA en Illinois, etc. Necesita opinión legal específica antes de lanzar en EU/US.
3. **Costo de IA en Match.** Si dossier generation no se mantiene <$3/mes/MAU, el modelo de negocio se rompe. Eval framework + caching agresivo.
4. **Audiencia de Words muy específica.** Es la app más nicho. Posible que necesite un launch separado, casi tipo Substack en sus inicios — gente que escribe atrayendo gente que escribe.
5. **Match-Maker humano (plan Concierge $199) no escala.** Diseñado para perder dinero per-user pero ganar marketing/halo effect. Cuidado con que se vuelva el único producto que importa.

---

## Anexo: artefactos que voy a producir como entregables (post-MVP backend)

Una vez Auth + storage + Voice estén shipped, comienzo a producir estos en `docs/superpowers/marketing/`:

- `brand-voice.md` — guía de copy con 30 ejemplos do/don't
- `email-sequences/welcome-{voice,words,match}.md` — drip de 6 emails por app
- `posts/{twitter,linkedin,threads}-monthly-calendar.md` — 90 días de posts redactados
- `aso/{ios,android}-listings.md` — título, subtítulo, keywords, descripción larga
- `ads/{meta,tiktok,google}-creative-briefs.md` — briefs + copy + visuals briefs
- `pr/press-pitch.md` + `pr/journalist-targets.csv` — pitches segmentados
- `legal/privacy-promise.md` — borrador editado por abogado después
- `metrics/dashboards.md` — definiciones formales de cada métrica + queries SQL

Cada uno listo para que tú apruebes con un sí/no y publiques con un click.
