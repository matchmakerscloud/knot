# Getting started

Guía paso a paso para arrancar a desarrollar Knot localmente.

## Prerequisitos

- **Node.js 20+** (recomendado: usar `nvm` o `fnm`)
- **pnpm 9+** (`npm install -g pnpm`)
- **Docker Desktop** o Docker Engine + Docker Compose
- **Git**
- (Opcional, para mobile) **Xcode** (iOS) o **Android Studio**

Verificación rápida:

```bash
node --version    # v20.x.x
pnpm --version    # 9.x.x
docker --version
```

## Setup inicial

```bash
# 1. Clonar el repo
git clone <repo-url> knot
cd knot

# 2. Copiar variables de entorno
cp .env.example .env
# Edita .env y completa los valores reales (al menos OPENAI_API_KEY y ANTHROPIC_API_KEY)

# 3. Generar secrets
echo "JWT_ACCESS_SECRET=$(openssl rand -hex 64)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)" >> .env
echo "PASSWORD_PEPPER=$(openssl rand -hex 32)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env

# 4. Instalar dependencias del monorepo
pnpm install

# 5. Levantar servicios locales (Postgres, Redis, MinIO)
docker compose -f infra/docker/docker-compose.dev.yml up -d

# 6. Esperar ~10 segundos a que los servicios arranquen, luego verificar:
docker compose -f infra/docker/docker-compose.dev.yml ps
# Todos deben aparecer como "healthy"

# 7. Generar y aplicar migraciones de DB
pnpm --filter @knot/api db:generate
pnpm --filter @knot/api db:migrate
```

## Levantar servicios

En terminales separadas:

```bash
# API (puerto 4000)
pnpm --filter @knot/api dev

# Web (puerto 3001)
pnpm --filter @knot/web dev

# Admin (puerto 3002)
pnpm --filter @knot/admin dev

# Mobile (Expo dev server)
pnpm --filter @knot/mobile start
# Después: presiona 'i' para iOS simulator o 'a' para Android emulator
```

O todo a la vez con Turborepo:

```bash
pnpm dev
```

## Verificar que todo funciona

```bash
# API health check
curl http://localhost:4000/health
# Esperas: {"status":"ok"}

# MinIO console
open http://localhost:9001
# Login: minioadmin / minioadmin

# Web
open http://localhost:3001
```

## Primera tarea sugerida

Recomiendo arrancar con:

1. **Implementar `/v1/auth/signup` y `/v1/auth/login`** (módulo `auth`).
   - Crea `src/modules/auth/` con la estructura del CLAUDE.md.
   - Usa los schemas Zod de `@knot/shared-types`.
   - Tests unitarios e integration.

2. **Pantalla de signup en mobile** que llame ese endpoint.

3. **Setup CI** (GitHub Actions) — lint, typecheck, test en cada PR.

## Comandos útiles

```bash
# Ver logs de un servicio Docker
docker compose -f infra/docker/docker-compose.dev.yml logs -f postgres

# Resetear DB local
docker compose -f infra/docker/docker-compose.dev.yml down -v
docker compose -f infra/docker/docker-compose.dev.yml up -d
pnpm --filter @knot/api db:migrate

# Type check todo el monorepo
pnpm typecheck

# Build de un paquete específico
pnpm --filter @knot/shared-types build

# Tests en watch mode
pnpm --filter @knot/api test:watch

# Limpiar caches
pnpm clean
rm -rf node_modules .turbo
pnpm install
```

## Troubleshooting

**"Port already in use"** — algo ya corre en 4000/3001/3002. Mata el proceso o cambia el puerto en `.env`.

**Migraciones fallan con "extension vector does not exist"** — el contenedor de Postgres no aplicó `init-db.sql`. Bórralo y reinícialo:

```bash
docker compose -f infra/docker/docker-compose.dev.yml down -v
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

**MinIO no muestra el bucket** — el contenedor `minio-init` debería haberlo creado. Verifica con:

```bash
docker compose -f infra/docker/docker-compose.dev.yml logs minio-init
```

**Mobile no conecta a la API** — en simulador iOS, `localhost` funciona. En device físico o Android emulator, usa la IP local de tu máquina (`192.168.x.x`).

## Recursos

- Specs de producto: `docs/knot-{voice,words,match}-spec.md`
- Arquitectura: `docs/architecture.md`
- Modelo de datos: `docs/data-model.md`
- API: `docs/api-contract.md`
- Convenciones de código: `CLAUDE.md`
- Decisiones arquitectónicas: `docs/decision-log.md`
