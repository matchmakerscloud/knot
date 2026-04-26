# Política de seguridad de Knot

Knot maneja datos extremadamente sensibles: voz, fotos, mensajes privados, ubicación. La seguridad no es un feature, es un requisito.

## Reportar una vulnerabilidad

**No abras un issue público para vulnerabilidades.** Reportá directamente a:

- **Email**: `security@matchmakers.cloud` (PGP key publicada en `/security/pgp.txt` cuando esté disponible)
- **GitHub Security Advisories**: `https://github.com/<org>/knot/security/advisories/new` (preferido)

Confirmamos recepción dentro de **48 horas**. Update con plan en **5 días hábiles**. Patch desplegado y disclosure coordinada según severidad (ver tabla abajo).

## Bug bounty

Pagamos por vulnerabilidades verificadas según severidad e impacto:

| Severidad | Pago (USD) | Plazo de patch |
|---|---|---|
| **Crítica** (RCE, masive data leak, auth bypass) | $500–2000 | 24h |
| **Alta** (account takeover, IDOR sensible, voice fingerprint exfil) | $250–1000 | 5 días |
| **Media** (XSS, CSRF en endpoints sensibles, rate-limit bypass) | $100–500 | 14 días |
| **Baja** (info disclosure menor, headers, defaults débiles) | $50–250 | 30 días |

Aplica:
- Primer reporte gana. Duplicados no compensados.
- Solo aplica para targets dentro del scope (ver abajo).
- Compensación adicional en **créditos de Knot** (ver `CONTRIBUTING.md`).

## Scope

### In-scope (aplica bounty)
- `*.matchmakers.cloud` — toda la infraestructura productiva
- `*.matchmaking.cloud`
- Apps mobile/web/admin
- API endpoints (`https://api.matchmakers.cloud/v1/*`)
- WebSocket (`wss://api.matchmakers.cloud/v1/ws`)
- Microservicios (voice fingerprint, etc.)
- CLI tools y SDKs publicados

### Out-of-scope (sin bounty)
- Servicios de terceros (Cloudflare, Resend, etc.)
- Subdominios sin servicio activo (devuelven 503)
- Mailpit en `mail.matchmakers.cloud` (interno, basic-auth ya conocida)
- Vulnerabilidades teóricas sin POC funcional
- Reportes generados por scanners automatizados sin validación humana

## Lo que cuenta como vulnerabilidad

- ✅ Cualquier acceso no autorizado a datos de otros usuarios.
- ✅ Bypass de cifrado de audios/fotos.
- ✅ Voice fingerprint exfiltration o manipulation.
- ✅ Corrupción de datos persistentes.
- ✅ Bypass de moderación o de reportes.
- ✅ XSS, CSRF, SQLi, SSRF, IDOR.
- ✅ Race conditions con impacto.
- ✅ Cualquier bypass de rate-limit en endpoints sensibles (auth, recordings, embeddings).
- ✅ Auth confusion (usar sesión de otro usuario).

## Lo que NO cuenta

- ❌ "Falta header X" sin impacto demostrable.
- ❌ Self-XSS (engañarse a sí mismo no es ataque).
- ❌ Issues de SPF/DMARC en dominios no usados para correo.
- ❌ Ataques físicos.
- ❌ Ingeniería social a empleados.
- ❌ DoS/DDoS volumétrico (no testes esto).
- ❌ Versiones de software con CVE conocida pero sin POC en nuestro deployment.

## Reglas para investigadores

1. **Solo testear cuentas que vos crees**. No accedas a cuentas reales.
2. **Sin DoS volumétrico**. Si tu PoC requiere stress, avisanos primero.
3. **Sin spam masivo** a usuarios reales (testá con cuentas tuyas).
4. **Sin filtración pública** antes del coordinated disclosure.
5. **Sin uso de datos** que veas accidentalmente. Reportá y olvidá.
6. **Buena fe**. Si actuás con buena fe y dentro del scope, no te perseguimos legalmente.

## Coordinated disclosure

- Crítica: 7 días desde patch a disclosure pública.
- Alta: 30 días.
- Media: 60 días.
- Baja: 90 días.
- Podemos extender de común acuerdo si el patch requiere cambios estructurales.
- Te acreditamos públicamente si querés (opt-in).

## Hall of fame

Investigadores con vulnerabilidades válidas reportadas — listado con permiso explícito. (Vacío hasta que llegue el primero.)

## Nuestro compromiso técnico

- **TLS 1.2 mínimo** en todas las conexiones públicas.
- **Argon2id** para hashing de passwords (peppered).
- **Refresh tokens hasheados** (SHA-256) en DB; los tokens raw nunca persisten.
- **Audios/fotos**: cifrados en reposo con clave por contenido envuelta con master KMS-style key.
- **Signed URLs** para acceso a media (5 min TTL).
- **PII encryption** en columnas relevantes (futuro: tabla `users.locale` y similares quedan en claro; teléfono/email tokenizados).
- **Rate limiting** agresivo en endpoints de auth, recordings, likes.
- **Audit logs** sin contenido de mensajes/audios (solo metadata).
- **Pen-test anual** (cuando MAU > 50K).
- **SOC 2 Type II** como meta a 18 meses.

## Lo que prometemos NO hacer

- ❌ No subimos datos de usuarios a redes blockchain o distribuidas públicas.
- ❌ No vendemos datos a brokers, anunciantes, ni a entidades gubernamentales sin orden judicial.
- ❌ No entrenamos modelos generales de terceros con conversaciones íntimas (acuerdo Zero Data Retention con Anthropic/OpenAI).
- ❌ No "data dump" de respaldos a contractors.
- ❌ No reads silenciosos por parte de operadores ("debug" requiere consent + audit log).

## Auditorías independientes

Knot acepta auditorías académicas o de organizaciones civiles (EFF, Privacy International) bajo NDA limitado. Resultados de auditorías relevantes se publican con redacción acordada en `/security/audits/`.

## Contacto

`security@matchmakers.cloud` — respuesta en 48h.
