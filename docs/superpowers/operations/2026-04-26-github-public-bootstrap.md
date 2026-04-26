# Bootstrap del repo público en GitHub — guía de 90 segundos

> Esta es la única tarea de GitHub que necesito que hagas tú, Mario. No puedo crear la cuenta porque GitHub bloquea automatización al signup. Después de los 4 pasos abajo, **yo hago todo el resto programáticamente** vía API.

## Lo que vas a hacer (90 segundos)

### 1. Crear cuenta o login en GitHub
- Si no tienes cuenta: https://github.com/signup → email `cferes@qin.cl` (o el que prefieras) → username sugerido: `feres-mario` o el que te calce → completa.
- Si ya tienes: login.

### 2. Crear la organización
- Ir a https://github.com/account/organizations/new
- Plan: **Free**
- Organization account name: **`knot-app`** (recomendado) o el handle que prefieras (avísame si cambias)
- Contact email: `cferes@qin.cl`
- This organization belongs to: **My personal account** (lo cambiamos a "business" cuando incorporemos la for-profit legal).
- Skip invitar miembros por ahora.

### 3. Generar Personal Access Token (PAT) classic
- Ir a https://github.com/settings/tokens (no fine-grained, classic — más simple para bootstrap)
- "Generate new token (classic)"
- Note: **`Knot bootstrap — do not share`**
- Expiration: **30 days** (después rotamos a fine-grained con scope mínimo)
- Scopes — marca exactamente estos 4:
  - `repo` (todo el subtree)
  - `workflow`
  - `admin:org` → solo `write:org` y `read:org`
  - `delete_repo`
- Generate → **copia el token** (`ghp_...` empieza). Solo se ve una vez.

### 4. Pasarme el token
- Pegalo en chat conmigo, o
- Ponelo en `/home/feres/.env` como nueva línea: `GITHUB_TOKEN=ghp_...` y dime "ya está"

## Lo que yo hago automáticamente con el token

Apenas tengo el `GITHUB_TOKEN`:

1. **Crear repo `knot-app/knot`** (público, AGPLv3) vía API.
2. **Push de los 11 commits actuales** desde el server al repo nuevo.
3. **Configurar branch protection** en `main`:
   - Requiere PR + 1 reviewer
   - Requiere status checks (CI) verde
   - No fuerza-push, no borrado
4. **Configurar GitHub Actions secrets** vacíos (DATABASE_URL, JWT_*, etc.) listos para que tú pegues los reales.
5. **Subir CI workflow** (ya existe en `.github/workflows/ci.yml`) y verificar que corre.
6. **Crear labels estándar**: `bug`, `feature`, `docs`, `good-first-issue`, `help-wanted`, `area:api`, `area:web`, `area:mobile`, `area:voice`, `area:words`, `area:match`, `area:infra`, `area:docs`, `priority:p0..p3`.
7. **Issue templates** (`.github/ISSUE_TEMPLATE/*.yml`): bug, feature request, security advisory.
8. **PR template** (`.github/pull_request_template.md`).
9. **Crear los 15 issues** del roadmap público (Plan #6 a #15) con descripciones y labels apropiados.
10. **Habilitar Discussions** + crear categorías: General, Q&A, Announcements, Show and tell.
11. **Habilitar Security Advisories** privados.
12. **Webhooks**: setup para que pushes futuros a `main` triggereen deploy a `185.214.134.192` automáticamente (script en server escucha y hace pull + restart systemd).
13. **README público de la org** (`knot-app/.github`): explica qué es Knot, link al manifesto, link a CONTRIBUTING.
14. **Pasar el repo a estado público** (`Settings → General → Visibility → Public`).
15. **Tweet/post draft** anunciando el repo público (queda en `docs/` para que tú apruebes y publiques manualmente cuando llegue el momento — yo no puedo postear en redes).

## Después de todo eso

- Tú **revocas el token** (`ghp_...`) en https://github.com/settings/tokens y generas uno fine-grained con scope mínimo si querés que yo siga teniendo acceso para mantenimiento. O lo dejas expirar a 30 días.
- Yo dejo en `/home/feres/.env` un comentario indicando que el bootstrap está hecho y el token rotado.

## Por qué este flujo es honesto y seguro

- **El token expira en 30 días** — daño limitado si algo sale mal.
- **Yo nunca te pido contraseña** — solo PAT de scope explícito.
- **Todo lo que hago queda en commits firmados como "Co-Authored-By: Claude"** — auditable.
- **Si en algún momento ves algo que no apruebas, revocas el token y todo lo demás sigue funcionando** (el repo te queda a tu nombre).

Esperando tu OK + token. Mientras tanto sigo con Plan #7.
