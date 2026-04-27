# Cómo contribuir a Knot

Knot es 100% código abierto y la comunidad es bienvenida. Este documento te dice cómo participar y qué esperar.

## TL;DR

- Código bajo **AGPLv3** (apps), **MIT** (packages reusables), **BSL 1.1 con flip a MIT a 4 años** (algoritmo de matching).
- Issues abiertos en GitHub. Buena fe asumida en ambas direcciones.
- Cada contribución verificada gana **créditos de Knot**: no son tokens, no se compran/venden. Canjean por suscripción gratuita, voto en governance de la fundación, y revenue share cuando la for-profit sea profitable.
- Privacidad y seguridad de datos sensibles **no son negociables**. Lee `SECURITY.md`.

## Tipos de contribución

| Tipo | Qué cuenta | Cómo verificar |
|---|---|---|
| Código | PR merged en `main` | Por commit, ponderado por LOC y tipo (feat > fix > chore) |
| Bug verificado | Issue reproducido y aceptado | Etiqueta `bug-confirmed` por mantenedor |
| Bug de seguridad | Reporte privado verificado | Ver `SECURITY.md` para flujo |
| Curaduría de prompts | Prompt aceptado al pool oficial | Métrica: response rate ≥ benchmark a 30 días |
| Moderación voluntaria | Decisión ratificada en revisión humana | Cohort de 100 decisiones, accuracy ≥ 92% |
| Traducción | Strings revisados por nativo del equipo | Por palabra revisada |
| Docs | PR merged en `/docs` | Por palabra editorial |
| Donación de GPU | Compute para tareas no sensibles | Por hora-GPU validada |

## Sistema de créditos

- 1 crédito = ~1 hora de trabajo de calidad equivalente.
- No transferibles. No comerciables. No tienen precio fijo.
- Tres canjes posibles:
  1. **Knot+ vitalicio** (1 vez por contributor, mínimo 50 créditos).
  2. **Voto en governance** de la fundación. 1 crédito = 1 voto. Decay 50% anual para evitar oligarquías de early.
  3. **Revenue share** trimestral cuando la for-profit sea profitable: pool de 5% de utilidad neta repartido proporcional a créditos del trimestre.
- Auditable: el ledger de créditos vive en `governance/credits-ledger.json` en este repo.

## Cómo contribuir código

1. Lee `CLAUDE.md`. Resume las convenciones, el stack, y los principios. **No es opcional**.
2. Lee la spec relevante en `docs/`.
3. Abre un issue antes de implementar algo grande. Discute approach.
4. Branch desde `main`, naming: `feat/breve-descripcion`, `fix/breve-descripcion`, `docs/breve-descripcion`.
5. Tests obligatorios:
   - Unit tests en `services/` y `repositories/` (coverage ≥ 70%).
   - Integration tests para endpoints públicos.
6. PR template:
   - Qué cambia y por qué.
   - Captura/video si toca UI.
   - Link a la sección de spec correspondiente.
   - Pasos de verificación local.
7. Code review por al menos un mantenedor. Sin debates de estilo (Prettier es de la casa). Discusión técnica = ok, "yo lo haría diferente" sin razón ≠ ok.
8. CI verde antes de merge: lint, typecheck, tests, build, security audit.

## Lo que NO aceptamos

- PRs que rompen convenciones del `CLAUDE.md` sin discusión previa.
- Dependencias nuevas sin justificación documentada (cada paquete = superficie de ataque).
- Cambios al `system prompt master` de Knot sin proceso de eval (afecta calidad emocional del producto, no se cambia a la ligera).
- Telemetry "para ver si funciona" — solo telemetría aprobada por privacy review.
- "Decentralizemos esto con blockchain" — está rechazado por diseño. Lee `docs/superpowers/success-plan/2026-04-26-pivot-ai-agent-and-decentralization.md`.
- Crawling, scraping, o cualquier intento de extraer datos de usuarios.

## Code of conduct

Lee `CODE_OF_CONDUCT.md`. Resumen: respeto, buena fe, asumimos lo mejor del otro. Hostilidad → un warning → segundo strike → ban. Sin grises.

## Propiedad intelectual

- Al hacer PR aceptás licenciar tu contribución bajo la licencia del archivo correspondiente.
- Si tu empleador tiene derechos sobre tu trabajo, es tu responsabilidad obtener permiso antes de contribuir.

## Cómo escalar a mantenedor

1. ≥ 30 créditos en 6 meses.
2. ≥ 1 PR por mes durante ese período.
3. Code reviews útiles a otros contributors.
4. Voto unánime de los mantenedores existentes.

Mantenedores ganan derecho a merge en su área de expertise + voto doble en governance.

### Mantenedores actuales

- **Mario Feres** — fundador, mantenedor principal de todas las áreas. `@matchmakerscloud` en GitHub.
  Email del proyecto: `hello@matchmakers.cloud` · Seguridad: `security@matchmakers.cloud`.

(La lista crecerá conforme la comunidad aporte. Para postularte como maintainer, abre una issue con el label `maintainer-application` describiendo tus 30 créditos y áreas de expertise.)

### Cómo claim a `good-first-issue`

1. Filtra issues con [`good-first-issue`](https://github.com/matchmakerscloud/knot/labels/good-first-issue).
2. Comenta `@knot claim` en la issue para reservarla — un mantenedor confirma asignación.
3. Si no hay actividad en 7 días, otra persona puede tomarla.
4. Una persona puede tener máximo 2 good-first-issues activas a la vez (para que no acaparen).
5. Tu PR debe referenciar la issue (`Closes #N`).

### Áreas de expertise que buscamos

| Área | Skills | Issues abiertos |
|---|---|---|
| `area:voice` | Audio processing, ffmpeg, MediaRecorder, anti-catfish | #18, #19 |
| `area:words` | Embeddings, semantic search, NLP | — |
| `area:match` | LLM ops, prompt engineering, evals | (si abrimos) |
| `area:safety` | Moderation, anti-fraud, abuse patterns | (si abrimos) |
| `area:web` | Next.js 14, React, mobile-first PWA, accessibility | — |
| `area:infra` | Postgres, Redis, BullMQ, S3, Docker, systemd | — |
| `docs` | Translations (en, pt-BR, fr, de, ja...), tutorials | #20 (en+pt-BR shipped) |

## Cómo establecer foco de mes

La fundación publica el primer lunes de cada mes el foco temático ("`#voice-feed-quality`", "`#match-empathy-eval`", etc.). Los créditos por contribuciones que avanzan el foco del mes valen 1.5×. Esto permite enfocar comunidad sin imponer.

## Compensación de fundador y maintainers core

- **Mario (fundador)**: equity 100% en Knot Inc. (la for-profit). Asiento perpetuo en board de la fundación. Sin créditos (no aplica).
- **Mantenedores core con dedicación full-time**: salario competitivo + equity bajo standard tech (vesting 4 años, cliff 1 año). Pool reservado del 10% de equity total.
- **Contributors part-time**: créditos. Y — cuando la empresa pueda — bounty payments en USD para hitos importantes.

Toda la economía es transparente: P&L de la for-profit publicado anualmente.

## Cómo abrir un canal de comunicación

- **Discusiones de feature**: GitHub Discussions.
- **Bugs**: GitHub Issues.
- **Vulnerabilidades**: ver `SECURITY.md` (no en Issues público).
- **Comunidad social**: Discord (link cuando exista) y Matrix (knot:matchmakers.cloud cuando exista).

## Last word

Knot existe porque alguien tiene que probar que la IA puede estar al servicio del corazón humano sin volverse parásito de la atención. Si vos estás de acuerdo con esa premisa, sos parte. Bienvenida.
