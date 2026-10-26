// Aplica las migraciones Drizzle pendientes al arrancar el servidor.
// Así cada despliegue en Hostinger deja la BD al día sin tener que entrar por SSH.
import path from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";

type Estado = { estado: "pendiente" | "ok" | "error" | "desactivado"; error?: string; at?: string };
const g = globalThis as unknown as { __vipMigraciones?: Estado };
g.__vipMigraciones ??= { estado: "pendiente" };

export function estadoMigraciones(): Estado {
  return g.__vipMigraciones!;
}

export async function migrarAlArrancar() {
  if (process.env.MIGRAR_AL_ARRANCAR === "0") {
    g.__vipMigraciones = { estado: "desactivado" };
    return;
  }
  try {
    const { db } = await import("@/db");
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    g.__vipMigraciones = { estado: "ok", at: new Date().toISOString() };
    console.log("[migraciones] BD al día");
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    g.__vipMigraciones = { estado: "error", error: mensaje, at: new Date().toISOString() };
    // No tumbamos el servidor: /api/salud lo muestra y se puede investigar.
    console.error("[migraciones] ERROR:", mensaje);
  }
}
