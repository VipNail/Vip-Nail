# Montar el staging en Hostinger

Cuentas: GitHub **VipNail** (repo `VipNail/vip-nail`) y Hostinger **Unlimited** de Nadya. Plata entra como colaborador.
El plan Unlimited admite hasta 5 webs Node.js: staging y producción ocupan 2. Coste añadido: 0 €.
**No pegues ninguna contraseña ni clave en el chat.** Cada bloque se hace cuando el técnico lo pida, uno cada vez.

---

## Bloque 1 — Dar permiso a Claude para subir el código (una sola vez)
Hay que hacerlo con la sesión de GitHub de **VipNail** (la cuenta de Nadya), no con platacrew.
1. Abre https://github.com/apps/claude/installations/select_target
2. Elige **VipNail**.
3. Marca **Only select repositories** → `vip-nail`.
4. Pulsa **Install**.
5. Avisa al técnico: él sube el código (ramas `main` y `staging`).

Se puede revocar cuando se quiera en GitHub → Settings → Applications.

## Bloque 2 — Base de datos de staging
1. hPanel → **Websites** → **Dashboard** de cualquier web del plan → **Databases** → **Management**.
2. Crea:
   - base de datos `vipstaging`
   - usuario `vipstaging`
   - contraseña **solo de letras y números, 24 caracteres o más**
3. Guarda la contraseña en tu gestor de contraseñas.
4. Apunta los **nombres completos** que muestra Hostinger, con su prefijo (tipo `u123456789_vipstaging`).

## Bloque 3 — Web app de staging
1. hPanel → **Websites** → **Add Website** → **Node.js web app** → GitHub (ya conectado) → repo `vip-nail`.
2. Ajustes de despliegue:
   - Framework: **Next.js**
   - Branch: **staging**
   - Node.js: **22**
   - Build: `npm run build`
   - Package manager: **npm**
3. Dominio:
   - Si nadyavipnails.com está en este Hostinger, crea `staging.nadyavipnails.com` como web propia.
   - Si no, usa el dominio temporal que ofrezca Hostinger.
4. **Environment variables** — añade estas 6:

   | Nombre | Valor |
   |---|---|
   | `ENTORNO` | `staging` |
   | `DATABASE_URL` | `mysql://<usuario completo>:<contraseña>@127.0.0.1:3306/<base de datos completa>` |
   | `BETTER_AUTH_URL` | la dirección de la web con `https://`, sin barra final |
   | `BETTER_AUTH_SECRET` | 32+ caracteres aleatorios (generador del gestor de contraseñas) |
   | `INSTALAR_TOKEN` | otro valor aleatorio largo |
   | `MIGRAR_AL_ARRANCAR` | `1` |

   El host es `127.0.0.1`, no `localhost`.
5. **Deploy**. Espera 2–5 min.
6. Pasa al técnico la dirección de la web.

## Bloque 4 — Crear tu cuenta y entrar
1. Abre `<dirección>/instalar`.
2. Rellena:
   - el código `INSTALAR_TOKEN`
   - tu nombre
   - tu email
   - una contraseña nueva
3. Abre `<dirección>/entrar`.
4. Entra: verás el CRM.
5. En Hostinger, **borra** la variable `INSTALAR_TOKEN`.
6. Pulsa **Running** → **Restart**.

## Notas para el técnico
- `/api/salud` muestra si llega a la BD y el estado de las migraciones.
- Los logs están en hPanel → **Deployments** (build) y **Runtime Logs**.
- Los archivos subidos van fuera de `hbuilds/`, que Hostinger sobrescribe en cada despliegue.
- Límites del plan: peticiones de 120 s como máximo, sin WebSockets entrantes y sin procesos en segundo plano permanentes. Las tareas periódicas van por el cron de Hostinger.
