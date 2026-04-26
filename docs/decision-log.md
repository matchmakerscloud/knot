# Decision log

Decisiones arquitectónicas importantes del proyecto. Cada decisión nueva se documenta en formato ADR (Architecture Decision Record). Esto deja un rastro de por qué hicimos lo que hicimos.

## Formato

```
## [Número] — [Título]

**Fecha:** YYYY-MM-DD
**Estado:** propuesta | aceptada | reemplazada | obsoleta

### Contexto
Qué problema o pregunta motiva esta decisión.

### Opciones consideradas
1. Opción A — pros/cons
2. Opción B — pros/cons

### Decisión
Qué se decidió y por qué.

### Consecuencias
Qué cambia, qué hay que hacer, qué riesgos quedan.
```

---

## 1 — Monorepo con pnpm + Turborepo

**Fecha:** 2026-04-26
**Estado:** aceptada

### Contexto

El proyecto Knot tiene 4 apps (api, mobile, web, admin) y al menos 3 paquetes compartidos. Necesitamos compartir tipos TypeScript y lógica entre back y front.

### Opciones consideradas

1. **Polyrepo** — un repo por servicio. Separación máxima, pero duplicación de tipos y refactors atómicos imposibles.
2. **Monorepo con npm workspaces** — simple, pero performance de instalación y builds pobre.
3. **Monorepo con pnpm + Turborepo** — installs rápidos, hard linking de dependencies, cache de builds.
4. **Nx** — feature-rich pero opinionated y curva de aprendizaje pronunciada.

### Decisión

Monorepo con pnpm workspaces + Turborepo.

### Consecuencias

- Un solo `pnpm install` configura todo el proyecto.
- Cambios atómicos entre backend y frontend.
- Cache de Turborepo acelera CI.
- Cualquier dev nuevo puede correr todo con docker compose + pnpm dev.

---

## 2 — Drizzle ORM en lugar de Prisma

**Fecha:** 2026-04-26
**Estado:** aceptada

### Contexto

Necesitamos un ORM type-safe para PostgreSQL.

### Opciones consideradas

1. **Prisma** — muy popular, gran DX, pero migraciones problemáticas a escala, runtime pesado, abstracciones que se interponen al SQL.
2. **Drizzle ORM** — más nuevo, más cercano a SQL, mejor performance, type inference excelente.
3. **TypeORM** — descartado por mantenimiento dudoso.
4. **Kysely** — query builder puro, muy bueno pero menos maduro en ecosistema.

### Decisión

Drizzle ORM.

### Consecuencias

- Queries cercanas a SQL — más fácil de debuggear y razonar.
- Migraciones predecibles via Drizzle Kit.
- Compatible con pgvector (lo necesitamos para Match).
- Riesgo: ecosistema más pequeño que Prisma, menos plugins.

---

## 3 — pgvector dentro de Postgres en lugar de DB vectorial separada

**Fecha:** 2026-04-26
**Estado:** aceptada

### Contexto

Knot Match y el matching semántico de Words requieren búsqueda por similitud de embeddings.

### Opciones consideradas

1. **pgvector en Postgres** — una sola DB, fácil operación, rendimiento bueno hasta ~10M vectores.
2. **Pinecone** — managed, escalable, pero costo y otra pieza de infra.
3. **Qdrant** — open source, performance excelente, pero otro servicio que mantener.

### Decisión

pgvector en MVP. Migración a Pinecone/Qdrant cuando volumen lo justifique.

### Consecuencias

- Menos complejidad operacional inicial.
- Joins entre datos relacionales y vectores en una sola query.
- Path de migración claro si llegamos a necesitarlo.

---

## 4 — Una sola API para las tres apps

**Fecha:** 2026-04-26
**Estado:** aceptada

### Contexto

¿Tres servicios separados para Voice, Words y Match, o una sola API?

### Opciones consideradas

1. **Servicios separados** — máxima independencia, pero duplica auth, perfiles, mensajería.
2. **API monolítica modular** — un servicio con módulos por dominio.

### Decisión

API monolítica modular. Los tres productos comparten muchos conceptos (cuenta, mensajería, perfiles, reportes) y el overhead operacional de tres servicios no se justifica en MVP.

### Consecuencias

- Single deploy.
- Posibilidad de migrar a microservicios si un módulo crece.
- Disciplina necesaria: cada módulo debe tener fronteras claras.

---

## 5 — JWT con refresh, sin cookie httponly

**Fecha:** 2026-04-26
**Estado:** aceptada

### Contexto

Cómo manejar autenticación entre cliente (mobile + web) y API.

### Opciones consideradas

1. **Sessions con cookie httponly** — bueno para web, problemático para mobile.
2. **JWT sin refresh** — sencillo pero rotación dolorosa.
3. **JWT corto (15min) + refresh token (30d) en DB** — balanceado.

### Decisión

JWT con refresh. Access token en memoria, refresh en `expo-secure-store` (mobile) y httponly cookie (web).

### Consecuencias

- Logout efectivo (revocación del refresh).
- Rotación de claves manejable.
- Cliente se complejiza un poco con refresh logic — abstraer en interceptor.

---

## 6 — Voice fingerprinting como microservicio Python

**Fecha:** 2026-04-26
**Estado:** aceptada

### Contexto

Necesitamos voice fingerprinting (anti-catfish) en Voice. Las mejores libs son Python (pyannote.audio).

### Decisión

Microservicio Python (FastAPI) dedicado. Backend principal en Node lo llama via HTTP.

### Consecuencias

- Una pieza más de infra.
- Mejor calidad que cualquier opción Node.
- Aislado: si falla, no tira el resto.
