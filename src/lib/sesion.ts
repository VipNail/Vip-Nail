// Capa de acceso a la sesión (DAL). Toda comprobación de acceso pasa por aquí.
import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cliente, staff, type Rol } from "@/db/schema";
import { auth } from "./auth";
import { tienePermiso, type Permiso } from "./permisos";

export type MiembroEquipo = {
  userId: string;
  staffId: string;
  nombre: string;
  email: string;
  rol: Rol;
};

export async function leerSesion() {
  return auth.api.getSession({ headers: await headers() });
}

/** Devuelve el miembro del equipo con sesión, o redirige a /entrar. */
export async function exigirEquipo(permiso: Permiso = "crm.ver"): Promise<MiembroEquipo> {
  const sesion = await leerSesion();
  if (!sesion) redirect("/entrar");

  const [fila] = await db
    .select({ id: staff.id, nombre: staff.nombre, rol: staff.rol, activo: staff.activo })
    .from(staff)
    .where(eq(staff.userId, sesion.user.id))
    .limit(1);

  if (!fila || !fila.activo || !tienePermiso(fila.rol, permiso)) redirect("/sin-acceso");

  return {
    userId: sesion.user.id,
    staffId: fila.id,
    nombre: fila.nombre,
    email: sesion.user.email,
    rol: fila.rol,
  };
}

export type Alumna = { userId: string; clienteId: string; nombre: string; email: string };

/** La clienta con sesión (zona de alumna), o null. */
export async function alumnaActual(): Promise<Alumna | null> {
  const sesion = await leerSesion();
  if (!sesion) return null;
  const [c] = await db
    .select({ id: cliente.id, nombre: cliente.nombre, borrada: cliente.borradaAt })
    .from(cliente)
    .where(eq(cliente.userId, sesion.user.id))
    .limit(1);
  if (!c || c.borrada) return null;
  return { userId: sesion.user.id, clienteId: c.id, nombre: c.nombre, email: sesion.user.email };
}

/** Devuelve la alumna con sesión o manda a /cuenta/entrar. */
export async function exigirAlumna(): Promise<Alumna> {
  const a = await alumnaActual();
  if (!a) redirect("/cuenta/entrar");
  return a;
}
