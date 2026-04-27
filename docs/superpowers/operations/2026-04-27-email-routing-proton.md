# Email — estado actual y cómo activar inbox unificado en Proton

> Honestidad: Proton Mail free **no permite SMTP outbound** ni recibir en custom domain. Por eso usamos Resend (sender) + Proton (recipient via reply-to + bcc). Este doc explica el setup actual y cómo cerrar el loop completo.

## Estado actual (commit `ec0234d`)

| Capability | Cómo funciona | Estado |
|---|---|---|
| **Sender** | `Knot <hello@matchmakers.cloud>` via Resend HTTP API (`api.resend.com`) | ✅ verified, sa-east-1 region |
| **Reply-to** | Cada email lleva `reply_to: matchmakercloud@proton.me` — usuarios contestan a tu Proton | ✅ verified live |
| **BCC ops** | Cada email saliente lleva `bcc: matchmakercloud@proton.me` — copia íntegra en tu Proton | ✅ verified live |
| **Receiving on `*@matchmakers.cloud`** | Aún no — los MX no están configurados | ⏳ requiere 1 click + 30s |

## Cómo cerrar el loop: `*@matchmakers.cloud` → tu Proton inbox

Tres opciones, en orden de preferencia operacional:

### Opción A — Cloudflare Email Routing (free, recomendada)

Cloudflare ofrece email forwarding gratis (200/día). Se configura desde el dashboard del dominio, **NO via API** porque CF requiere consentimiento humano para activar Email Routing.

**Pasos (90 segundos tuyos):**

1. Ir a https://dash.cloudflare.com → seleccionar `matchmakers.cloud`
2. Sidebar izquierdo: **Email** → **Email Routing**
3. Click **Get Started** (primera vez) — Cloudflare auto-añade los MX records y el TXT SPF
4. **Routing rules**:
   - "Custom address" → escribe `hello@matchmakers.cloud` → Action: **Send to** → escribe `matchmakercloud@proton.me` → Save
   - **Catch-all address** → enable → Action: **Send to** → `matchmakercloud@proton.me` → Save (cubre todos los demás)
5. **Destination addresses** → CF te pide verificar `matchmakercloud@proton.me`. Te llega un email a Proton con un link de verificación; click → done.

Después de eso:
- `hello@matchmakers.cloud` → Proton ✅
- `support@matchmakers.cloud`, `security@matchmakers.cloud`, `conduct@matchmakers.cloud` → todos a Proton ✅
- Bonus: si alguien escribe a `cualquier.cosa@matchmakers.cloud`, llega a Proton ✅

### Opción B — Proton Mail Plus + custom domain ($4/mes)

Proton acepta `@matchmakers.cloud` como custom domain en plan paid. Requiere:

1. Upgrade a Proton Mail Plus (https://proton.me/pricing)
2. Settings → Domain Names → Add `matchmakers.cloud`
3. Proton te da MX/SPF/DKIM records — los configuro yo en Cloudflare via API
4. Verificación → done. Pero: el envío via Proton SMTP requiere generar un "SMTP submission token" en Settings → Account → Mail addresses (ese SÍ funciona desde la API de Knot).

Trade-off: $4/mo + Proton es la única dependencia para mail. Si Proton se cae, mail se cae.

### Opción C — Mantener solo Resend + reply-to (ya configurado)

Lo que tienes ahora. Pros: cero costo extra. Cons: emails que vengan a `*@matchmakers.cloud` rebotan (porque no hay MX records). Solo el reply-to a Proton funciona.

## Mi recomendación

**Opción A.** 90 segundos tuyos, gratis, robusta, profesional. Cuando lleguemos a 200+ emails/día (signup en escala), evaluamos Mail Plus para mover el sending. Pero por ahora Resend + Proton es perfecto.

## Cómo verificar que el reply-to funciona

Test live ya hecho:
- Waitlist signup con `cferes@qin.cl` → Resend entregó el email
- Header `Reply-To: matchmakercloud@proton.me` puesto correctamente
- `Bcc: matchmakercloud@proton.me` también

Cuando un usuario haga reply al email de waitlist, ese reply va directo a tu Proton inbox.

## Email aliases sin Email Routing (workaround temporal)

Mientras decides Opción A vs B, los emails que aparecen en docs/marketing/UI:

- `hello@matchmakers.cloud` — del Resend (sending). Reply va a Proton.
- `security@matchmakers.cloud` (en SECURITY.md) — actualmente NO recibe. Workaround: en SECURITY.md poner `security@matchmakers.cloud (forwarded to matchmakercloud@proton.me)` o cambiar el doc a usar el address Proton directo.
- `conduct@matchmakers.cloud` (en CODE_OF_CONDUCT.md) — mismo caso.

Te recomiendo Opción A YA porque:
1. Esos contactos están en docs públicos del repo (`SECURITY.md`, `CODE_OF_CONDUCT.md`)
2. Si alguien escribe ahí, ahora rebota — embarrassing
3. 90s vs reescribir docs después

## Vars de entorno relacionadas

```bash
MAIL_BACKEND=resend                          # 'resend' | 'smtp' | 'console'
MAIL_FROM=Knot <hello@matchmakers.cloud>     # FROM visible
MAIL_REPLY_TO=matchmakercloud@proton.me      # users replying go here
MAIL_BCC_OPS=matchmakercloud@proton.me       # internal copy of every outbound mail
RESEND_API_KEY=re_...                        # ya configurado
```
