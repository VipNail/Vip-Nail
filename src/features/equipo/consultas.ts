import "server-only";
import { and, asc, count, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { staff, user } from "@/db/schema";

export type PersonaEquipo = {
  id: string;
  userId: string;
  nombre: string;
  email: string;
  rol: (typeof staff.$inferSelect)["rol"];
  colorAgenda: string;
  activo: boolean;
};

const columnas = {
  id: staff.id,
  userId: staff.userId,
  nombre: staff.nombre,
  email: user.email,
  rol: staff.rol,
  colorAgenda: staff.colorAgenda,
  activo: staff.activo,
};

/** Equipo completo: activas primero, luego por nombre. */
export async function listarEquipo(): Promise<PersonaEquipo[]> {
  return db
    .select(columnas)
    .from(staff)
    .innerJoin(user, eq(user.id, staff.userId))
    .orderBy(desc(staff.activo), asc(staff.nombre));
}

export async function obtenerPersona(id: string): Promise<PersonaEquipo | null> {
  const [fila] = await db
    .select(columnas)
    .from(staff)
    .innerJoin(user, eq(user.id, staff.userId))
    .where(eq(staff.id, id))
    .limit(1);
  return fila ?? null;
}

/** Cuántas administradoras activas quedan sin contar a esta persona. */
export async function adminsActivasSalvo(staffId: string): Promise<number> {
  const [fila] = await db
    .select({ n: count() })
    .from(staff)
    .where(and(eq(staff.rol, "admin"), eq(staff.activo, true), ne(staff.id, staffId)));
  return fila?.n ?? 0;
}
