"use server";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { actividad, cliente, enlaceCuenta, leccion, pedido, progreso } from "@/db/schema";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";
import { exigirAlumna, exigirEquipo } from "@/lib/sesion";
import { crearEnlace, ErrorCuenta, leerEnlace, ponerContrasena, resumen } from "./cuenta";
import { tieneAcceso } from "./consultas";

export type EstadoEnlace = { error?: string; enlace?: string };

/** CRM: genera el enlace para que la clienta cree o cambie su contraseña (se le manda por WhatsApp). */
export async function generarEnlaceAcceso(_: EstadoEnlace, formData: FormData): Promise<EstadoEnlace> {
  const yo = await exigirEquipo("crm.ver");
  if (!tienePermiso(yo.rol, "clientas.gestionar") && !tienePermiso(yo.rol, "cursos.gestionar")) return { error: "No tienes permiso." };
  const id = String(formData.get("clienteId") ?? "");
  const [c] = await db.select({ id: cliente.id, nombre: cliente.nombre, email: cliente.email, borrada: cliente.borradaAt, userId: cliente.userId }).from(cliente).where(eq(cliente.id, id)).limit(1);
  if (!c || c.borrada) return { error: "Esa ficha no existe." };
  if (!c.email) return { error: "Primero añade su email en la ficha: es con lo que entrará." };
  const token = await crearEnlace(c.id, yo.userId);
  await db.insert(actividad).values({ userId: yo.userId, tipo: "cuenta.enlace", descripcion: `Enlace de acceso a la zona de alumna para ${c.nombre}`.slice(0, 255) });
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const base = process.env.BETTER_AUTH_URL || `https://${host}`;
  return { enlace: `${base.replace(/\/$/, "")}/cuenta/activar?e=${token}` };
}

export type EstadoActivar = { error?: string };

/**
 * Crea o cambia la contraseña. Vale con:
 *  - un enlace del equipo (?e=), de un solo uso y 7 días, o
 *  - el enlace secreto de un pedido pagado con un curso (?n=&t=), solo si aún no tiene cuenta.
 */
export async function activarCuenta(_: EstadoActivar, formData: FormData): Promise<EstadoActivar> {
  const password = String(formData.get("password") ?? "");
  const repetir = String(formData.get("repetir") ?? "");
  if (password.length < 10) return { error: "La contraseña tiene que tener al menos 10 caracteres." };
  if (password.length > 128) return { error: "La contraseña es demasiado larga." };
  if (password !== repetir) return { error: "Las dos contraseñas no coinciden." };

  const e = String(formData.get("e") ?? "");
  const n = String(formData.get("n") ?? "");
  const t = String(formData.get("t") ?? "");
  let clienteId: string;
  if (e) {
    const f = await leerEnlace(e);
    if (!f) return { error: "Este enlace ya no vale (caducado o usado). Pide uno nuevo al estudio." };
    clienteId = f.cliente.id;
  } else {
    const p = await pedidoConCurso(n, t);
    if (!p) return { error: "Este enlace no es válido." };
    if (p.userId) return { error: "Ya tienes cuenta. Entra con tu email y contraseña." };
    clienteId = p.clienteId;
  }

  let email: string;
  try {
    email = await ponerContrasena(clienteId, password);
  } catch (err) {
    if (err instanceof ErrorCuenta) return { error: err.message };
    throw err;
  }
  if (e) await db.update(enlaceCuenta).set({ usadoAt: new Date() }).where(eq(enlaceCuenta.tokenHash, resumen(e)));
  await db.insert(actividad).values({ userId: null, tipo: "cuenta.contrasena", descripcion: "Una alumna ha puesto su contraseña de la zona de alumna" });
  await auth.api.signInEmail({ body: { email, password, rememberMe: true }, headers: await headers() });
  redirect("/cuenta?aviso=bienvenida");
}

/** Pedido pagado con un curso online o una plaza, identificado por su enlace secreto. */
export async function pedidoConCurso(numero: string, token: string) {
  if (!numero || !token) return null;
  const [p] = await db
    .select({ id: pedido.id, clienteId: pedido.clienteId, estado: pedido.estado, envioTipo: pedido.envioTipo, userId: cliente.userId, borrada: cliente.borradaAt })
    .from(pedido)
    .innerJoin(cliente, eq(cliente.id, pedido.clienteId))
    .where(and(eq(pedido.numero, numero), eq(pedido.tokenAcceso, token)))
    .limit(1);
  if (!p || p.borrada || p.envioTipo !== "sin_envio" || p.estado !== "pagado") return null;
  return p;
}

/** Marca o desmarca una lección como vista. */
export async function marcarLeccion(formData: FormData): Promise<void> {
  const a = await exigirAlumna();
  const id = String(formData.get("leccionId") ?? "");
  const vista = formData.get("vista") === "1";
  const [l] = await db.select({ cursoId: leccion.cursoId }).from(leccion).where(eq(leccion.id, id)).limit(1);
  if (!l || !(await tieneAcceso(a.clienteId, l.cursoId))) redirect("/cuenta");
  if (vista) {
    await db.insert(progreso).values({ clienteId: a.clienteId, leccionId: id, completadaAt: new Date() }).onDuplicateKeyUpdate({ set: { completadaAt: new Date() } });
  } else {
    await db.delete(progreso).where(and(eq(progreso.clienteId, a.clienteId), eq(progreso.leccionId, id)));
  }
  const siguiente = String(formData.get("siguiente") ?? "");
  redirect(vista && /^[0-9A-Z]{26}$/.test(siguiente) ? `/cuenta/leccion?id=${siguiente}` : `/cuenta/leccion?id=${id}`);
}
