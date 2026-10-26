# VIP Nail Studio & School — web, tienda, academia y CRM

Una sola aplicación Next.js (web pública + CRM en `/crm`) con MySQL de Hostinger.
Documentación de proyecto en el Proyecto de Claude «Vip Nails» (`claude/ARQUITECTURA v0.1.md`).

## Stack
Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind 4 · MySQL/MariaDB + Drizzle ORM ·
Better Auth (email + contraseña) · Zod · Node 22.

## Arrancar en local
1. Node 22 y un MySQL/MariaDB local con una base de datos vacía (`utf8mb4`).
2. `cp .env.example .env.local` y rellena `DATABASE_URL`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) e `INSTALAR_TOKEN`.
3. `npm install`
4. `npm run dev` → las migraciones se aplican solas al arrancar.
5. Abre `http://localhost:3000/instalar` y crea el primer admin. Después, `/entrar` → `/crm`.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run typecheck` · `npm run lint` | Comprobaciones |
| `npm run db:generar` | Genera la migración SQL tras cambiar `src/db/schema/` |
| `npm run db:migrar` | Aplica migraciones a mano (normalmente no hace falta) |

## Reglas
- El esquema (`src/db/schema/`) y `drizzle/` solo los toca tecnico-vipnails. Cada cambio = migración + ARQUITECTURA §4.
- IDs ULID `char(26)`, importes en céntimos, fechas en UTC (se muestran en Europe/Madrid).
- Permisos por rol en `src/lib/permisos.ts`; toda página o acción del CRM llama a `exigirEquipo(permiso)`.
- Secretos solo en variables de entorno. Nada de `.env*` en el repo.
- Atajos marcados con `// DEBT:`.

## Ramas y despliegue
- `staging` → staging.nadyavipnails.com (Hostinger, BD aparte).
- `main` → producción (cuando se lance).
- `feat/factusol-*` → ramas de factusol-vipnails, las une el técnico.

Pasos de Hostinger: [`docs/STAGING-HOSTINGER.md`](docs/STAGING-HOSTINGER.md).

## Comprobación de estado
`GET /api/salud` → `{"estado":"ok","baseDeDatos":"ok","migraciones":{"estado":"ok"}}`
