"use server";
// Gestión del equipo desde el CRM. Solo administración: cada acción lo comprueba en servidor.
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { account, actividad, ROLES, session, staff, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { NOMBRE_ROL } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";
import { crearMiembroEquipo } from "./alta";
import { adminsActivasSalvo, obtenerPersona } from "./consultas";

export type EstadoFormulario = { error?: string };

const campos = {
  nombre: z.string().trim().min(2, "Pon el nombre.").max(120, "El nombre es demasiado largo."),
  email: z.email("Email no válido.").max(191),
  rol: z.enum(ROLES, "Elige un rol."),
  colorAgenda: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido."),
};

const EsquemaAlta = z.object({
  ...campos,
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres.").max(128),
});

const EsquemaEdicion = z.object({
  ...campos,
  id: z.string().length(26),
  // Vacía = no se cambia.
  password: z
    .string()
    .max(128)
    .refine((v) => v === "" || v.length >= 10, "La contraseña nueva debe tener al menos 10 caracteres."),
});

function leer<T extends z.ZodType>(esquema: T, datos: FormData) {
  const r = esquema.safeParse(Object.fromEntries(datos));
  return r.success
    ? ({ ok: true, datos: r.data } as const)
    : ({ ok: false, error: r.error.issues[0]?.message ?? "Revisa los datos." } as const);
}

export async function crearPersona(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("equipo.gestionar");
  const r = leer(EsquemaAlta, formData);
  if (!r.ok) return { error: r.error };

  try {
    await crearMiembroEquipo({ ...r.datos, creadoPor: yo.userId });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la cuenta." };
  }
  redirect("/crm/equipo?aviso=alta");
}

export async function editarPersona(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("equipo.gestionar");
  const r = leer(EsquemaEdicion, formData);
  if (!r.ok) return { error: r.error };
  const d = r.datos;

  const antes = await obtenerPersona(d.id);
  if (!antes) return { error: "Esa persona ya no existe." };

  const email = d.email.toLowerCase();
  const esYo = antes.id === yo.staffId;

  // Nunca dejar el CRM sin nadie de administración.
  if (antes.rol === "admin" && d.rol !== "admin") {
    if (esYo) return { error: "No puedes quitarte tu propio rol de administración." };
    if (antes.activo && (await adminsActivasSalvo(antes.id)) === 0)
      return { error: "Tiene que quedar al menos una persona de administración activa." };
  }

  if (email !== antes.email) {
    const [ocupado] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (ocupado) return { error: "Ya existe una cuenta con ese email." };
  }

  await db
    .update(staff)
    .set({ nombre: d.nombre, rol: d.rol, colorAgenda: d.colorAgenda })
    .where(eq(staff.id, antes.id));
  await db.update(user).set({ name: d.nombre, email }).where(eq(user.id, antes.userId));

  const cambios: string[] = [];
  if (d.nombre !== antes.nombre) cambios.push("nombre");
  if (email !== antes.email) cambios.push("email");
  if (d.rol !== antes.rol) cambios.push(`rol a ${NOMBRE_ROL[d.rol]}`);
  if (d.colorAgenda.toLowerCase() !== antes.colorAgenda.toLowerCase()) cambios.push("color");

  if (d.password) {
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(d.password);
    await db
      .update(account)
      .set({ password: hash })
      .where(and(eq(account.userId, antes.userId), eq(account.providerId, "credential")));
    // Con contraseña nueva se cierran sus sesiones abiertas (salvo si te la cambias tú).
    if (!esYo) await db.delete(session).where(eq(session.userId, antes.userId));
    cambios.push("contraseña");
  }

  if (cambios.length) {
    await db.insert(actividad).values({
      userId: yo.userId,
      tipo: "staff.edicion",
      descripcion: `Equipo: ${d.nombre} — cambia ${cambios.join(", ")}`.slice(0, 255),
    });
  }
  redirect("/crm/equipo?aviso=guardado");
}

/** Desactiva o reactiva a una persona. Desactivada: no puede entrar y se cierran sus sesiones. */
export async function cambiarActivo(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("equipo.gestionar");
  const id = String(formData.get("id") ?? "");
  const activar = formData.get("activar") === "1";

  const persona = await obtenerPersona(id);
  if (!persona) redirect("/crm/equipo?aviso=no-existe");
  if (persona.activo === activar) redirect(`/crm/equipo/editar?id=${id}`);

  if (!activar) {
    if (persona.id === yo.staffId) redirect(`/crm/equipo/editar?id=${id}&aviso=no-a-ti`);
    if (persona.rol === "admin" && (await adminsActivasSalvo(persona.id)) === 0)
      redirect(`/crm/equipo/editar?id=${id}&aviso=ultima-admin`);
  }

  await db.update(staff).set({ activo: activar }).where(eq(staff.id, persona.id));
  if (!activar) await db.delete(session).where(eq(session.userId, persona.userId));

  await db.insert(actividad).values({
    userId: yo.userId,
    tipo: activar ? "staff.reactivar" : "staff.desactivar",
    descripcion: `Equipo: ${persona.nombre} — ${activar ? "reactivación" : "desactivación"}`,
  });
  redirect(`/crm/equipo?aviso=${activar ? "reactivada" : "desactivada"}`);
}
