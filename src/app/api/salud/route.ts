// Comprobación de estado para staging/producción: ¿arranca la app y llega a la BD?
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { estadoMigraciones } from "@/lib/migrar";
import { version } from "../../../../package.json";

export async function GET() {
  const inicio = Date.now();
  let baseDeDatos: "ok" | "error" = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    baseDeDatos = "error";
  }
  const cuerpo = {
    estado: baseDeDatos === "ok" ? "ok" : "error",
    baseDeDatos,
    migraciones: estadoMigraciones(),
    entorno: process.env.ENTORNO ?? "local",
    version, // Hostinger no arranca con «npm start»: se lee de package.json al compilar
    ms: Date.now() - inicio,
  };
  return Response.json(cuerpo, {
    status: baseDeDatos === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
