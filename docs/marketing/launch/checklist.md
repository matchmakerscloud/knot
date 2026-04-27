# Launch checklist — Fase A waitlist a beta

> Orden cronológico. Un item se marca completado cuando lo está, no antes. Si algo bloquea, mover a "blockers" abajo y seguir con lo siguiente.

## Antes de anunciar nada (ya casi todo hecho)

- [x] Web app `https://app.matchmakers.cloud` mobile-first PWA installable
- [x] Backend `https://api.matchmakers.cloud` — auth, voice MVP, words MVP, match MVP, knot agent, photos, reports, blocks
- [x] Manifesto público en `/manifesto` con OG card
- [x] OG image generada (`/og.png`)
- [x] Repo público en GitHub con AGPLv3, MANIFESTO en es/en/pt-BR, CONTRIBUTING, CoC, SECURITY
- [x] Email backend Resend en producción (sa-east-1, dominio verified)
- [x] Email drip 6-pack escrito y wired al scheduler
- [x] Encryption-at-rest AES-256-GCM verified
- [x] Voice fingerprint anti-catfish vivo
- [x] LLM Gemini 2.5 Flash Lite + OpenAI-compat backup
- [x] Brand voice guide en `docs/marketing/brand-voice.md`
- [x] Twitter + LinkedIn 30-day calendars escritos
- [x] PR pitches por ángulo (tech / lifestyle / LATAM startup)

## Pendiente Mario — antes de lanzar campaña

- [ ] **Cloudflare Email Routing activo** (90s click). Para que `security@matchmakers.cloud`, `conduct@matchmakers.cloud`, etc. lleguen al Proton inbox. Doc: `docs/superpowers/operations/2026-04-27-email-routing-proton.md`.
- [ ] **Crear cuentas sociales:** Twitter `@knotapp` (o variante), LinkedIn empresa "Knot", Threads. (CAPTCHA + SMS verify, no automatizable.)
- [ ] **Decidir handle definitivo en redes** (knotapp / knot_ai / hello_knot / etc.)
- [ ] **Bio sugerida para todas:** *"El primer agente de IA al servicio del corazón humano. matchmakers.cloud"*
- [ ] **Foto de perfil:** la SVG de icono renderizada a PNG 400x400 (`/icon-512.png` recortado)
- [ ] **Primera ronda de press outreach** — usar `docs/marketing/pr/launch-pitch.md` y la lista de targets

## Día del lanzamiento (D-Day)

- [ ] Tweet de hilo del manifesto (usar Día 1 del calendario Twitter)
- [ ] Post LinkedIn del manifesto (Día 1 del calendario LinkedIn)
- [ ] Email a la base actual del waitlist con asunto "Estás dentro." (drip Día 30 — ya está implementado, solo necesita disparo manual el día decidido)
- [ ] Press emails enviados a los primeros 8 contactos (3 ángulos)
- [ ] Show HN post en Hacker News a las 8am hora pacific time (16:00 UTC)
- [ ] Producthunt launch (si es martes o miércoles)
- [ ] Verificar dashboards live (cuando `/v1/admin/metrics` exista)

## Semana 1 post-launch

- [ ] Responder TODO comentario serio en X / LinkedIn / HN dentro de 12h
- [ ] Recibir feedback temprano de 30 beta users → categorizar bugs vs feedback de UX
- [ ] Decision: cuántas invitaciones más por día durante semana 2
- [ ] Si press cubrió: amplificar en redes con voz Knot (no agradecimiento corporativo)

## Métricas a trackear desde Day 1

- Waitlist signups / día (con UTM source)
- Tasa de confirmación de email (drip step 0 → 1)
- Drip drop-off por step (cuánta gente no llega al email 5)
- Click-through al app desde email final
- Signups (auth) sobre invitaciones enviadas
- Voice recordings completadas / signup
- Voice replies enviadas / recording activa
- Mutual matches / día
- Time to first match (mediana)
- Knot agent conversations iniciadas / DAU
- Cost por usuario activo en LLM (target <$0.10/mes inicialmente)

Estas las exponemos en un dashboard interno (`/v1/admin/metrics`) cuando se construya. Por ahora, queries SQL ad-hoc en `docs/marketing/launch/sql-queries.md`.

## Blockers actuales

- Cuentas sociales (necesita Mario)
- Cloudflare Email Routing (necesita Mario)
- App Store / Play Console — diferido (estamos web-mobile primero)

## Política de comunicación

- **No prometas fechas exactas que no puedes cumplir.** "Pronto", "en las próximas semanas" — OK. "El 15 de mayo abrimos beta abierta" — solo si tienes certeza.
- **No infles métricas.** Si tenés 47 signups, decís 47. Knot odia el bullshit estadístico.
- **No respondas a competencia con superioridad.** Si Tinder lanza algo, Knot mantiene silencio. La voz no entra en peleas.
- **No uses "estamos súper emocionados de…"**. Knot no está emocionado. Knot es curioso, observador, calmado.
- **Cuando un usuario reporta un bug, agradecer y arreglar en las próximas 24h si es posible.** La velocidad de respuesta es parte de la promesa.

## Quedó pendiente para post-launch

- ASO drafts iOS / Android (no relevante hasta mobile native)
- Ad creative briefs Meta / TikTok (no relevante hasta budget aprobado)
- Influencer partnerships LATAM (Q2-Q3)
- Concierge plan de Match (post-MVP)
