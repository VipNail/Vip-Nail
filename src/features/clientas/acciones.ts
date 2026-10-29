"use server";
// Fichas de clientas desde el CRM: alta/edición, fusión de duplicadas y borrado (RGPD).
import { and, eq, gt, isNull, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { actividad, cita, cliente } from "@/db/schema";
import { exigirEquipo } from "@/lib/sesion";
import { normalizarTelefono } from "./buscar";

export type EstadoFormulario = { error?: string };

async function anotar(userId: string, tipo: string, descripcion: string) {
  await db.insert(actividad).values({ userId, tipo, descripcion: descripcion.slice(0, 255) });
}

/** «vip, alérgica a acrílico ,  Vip» → ["vip", "alérgica a acrílico"] */
function leerEtiquetas(texto: string): string[] {
  const vistas = new Set<string>();
  const salida: string[] = [];
  for (const e of texto.split(",").map((x) => x.trim().slice(0, 40)).filter(Boolean)) {
    const clave = e.toLowerCase();
    if (!vistas.has(clave)) {
      vistas.add(clave);
      salida.push(e.toLowerCase());
    }
  }
  return salida.slice(0, 20);
}

const EsquemaClienta = z.object({
  id: z.string().length(26).optional().or(z.literal("")),
  nombre: z.string().trim().min(2, "Pon el nombre.").max(160),
  telefono: z.string().trim().max(32),
  email: z.string().trim().max(191).refine((v) => v === "" || z.email().safeParse(v).success, "Email no válido."),
  etiquetas: z.string().max(600),
  notas: z.string().trim().max(4000),
});

export async function guardarClienta(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("clientas.gestionar");
  const r = EsquemaClienta.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  const id = d.id || undefined;
  const telefono = d.telefono ? normalizarTelefono(d.telefono) : null;
  if (d.telefono && !telefono) return { error: "Teléfono no válido." };
  const email = d.email.toLowerCase() || null;
  if (!telefono && !email) return { error: "Pon al menos el teléfono o el email." };

  // Evitar duplicados: ninguna otra ficha con ese teléfono o email.
  const repes = [telefono ? eq(cliente.telefono, telefono) : undefined, email ? eq(cliente.email, email) : undefined].filter(
    (x) => x !== undefined,
  );
  const [otra] = await db
    .select({ id: cliente.id, nombre: cliente.nombre })
    .from(cliente)
    .where(and(isNull(cliente.borradaAt), or(...repes), id ? ne(cliente.id, id) : undefined))
    .limit(1);
  if (otra) return { error: `Ya existe la ficha de ${otra.nombre} con ese teléfono o email. Ábrela desde el buscador (o fusiónalas).` };

  const consiente = formData.get("consentimientoMarketing") === "on";
  const datos = {
    nombre: d.nombre,
    telefono,
    email,
    etiquetas: leerEtiquetas(d.etiquetas),
    notas: d.notas || null,
    consentimientoMarketing: consiente,
  };

  let destino = id;
  if (id) {
    const [antes] = await db
      .select({ consiente: cliente.consentimientoMarketing, borrada: cliente.borradaAt })
      .from(cliente)
      .where(eq(cliente.id, id))
      .limit(1);
    if (!antes || antes.borrada) return { error: "Esta ficha ya no existe." };
    await db
      .update(cliente)
      .set({
        ...datos,
        // La fecha del consentimiento solo cambia cuando cambia el consentimiento.
        ...(consiente !== antes.consiente ? { consentimientoMarketingAt: consiente ? new Date() : null } : {}),
      })
      .where(eq(cliente.id, id));
    await anotar(yo.userId, "cliente.edicion", `Ficha editada: ${d.nombre}`);
  } else {
    const [nueva] = await db
      .insert(cliente)
      .values({ ...datos, origen: "estudio", consentimientoMarketingAt: consiente ? new Date() : null })
      .$returningId();
    destino = nueva.id;
    await anotar(yo.userId, "cliente.alta", `Clienta nueva: ${d.nombre}`);
  }
  redirect(`/crm/clientas/ficha?id=${destino}&aviso=guardada`);
}

/**
 * Fusiona la ficha «duplicada» dentro de la «principal»: le pasa sus citas (y en el futuro
 * pedidos y cursos), completa los datos que faltan, une etiquetas y notas, y borra la duplicada.
 */
export async function fusionarClientas(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("clientas.gestionar");
  const principalId = String(formData.get("principal") ?? "");
  const duplicadaId = String(formData.get("duplicada") ?? "");
  if (principalId === duplicadaId) redirect(`/crm/clientas/ficha?id=${principalId}`);

  const nombres = await db.transaction(async (tx) => {
    const filas = await tx
      .select()
      .from(cliente)
      .where(or(eq(cliente.id, principalId), eq(cliente.id, duplicadaId)))
      .for("update");
    const a = filas.find((f) => f.id === principalId);
    const b = filas.find((f) => f.id === duplicadaId);
    if (!a || !b || a.borradaAt || b.borradaAt) return null;
    // Dos cuentas web distintas no se pueden unir automáticamente.
    if (a.userId && b.userId) return "dos-cuentas" as const;

    await tx.update(cita).set({ clienteId: a.id }).where(eq(cita.clienteId, b.id));
    // DEBT: cuando existan pedidos, accesos a cursos y plazas, moverlos aquí también.

    const etiquetas = [...new Set([...(a.etiquetas ?? []), ...(b.etiquetas ?? [])])];
    const notas = [a.notas, b.notas].filter(Boolean).join("\n— Fusionada —\n") || null;
    // Primero se libera la duplicada (teléfono, email y cuenta son únicos o se buscan por ellos).
    await tx.delete(cliente).where(eq(cliente.id, b.id));
    await tx
      .update(cliente)
      .set({
        telefono: a.telefono ?? b.telefono,
        email: a.email ?? b.email,
        userId: a.userId ?? b.userId,
        factusolCodigo: a.factusolCodigo ?? b.factusolCodigo,
        etiquetas,
        notas,
        // Si dio el consentimiento en cualquiera de las dos, se conserva con su fecha.
        ...(!a.consentimientoMarketing && b.consentimientoMarketing
          ? { consentimientoMarketing: true, consentimientoMarketingAt: b.consentimientoMarketingAt }
          : {}),
      })
      .where(eq(cliente.id, a.id));
    return { a: a.nombre, b: b.nombre };
  });

  if (nombres === "dos-cuentas") redirect(`/crm/clientas/ficha?id=${principalId}&aviso=dos-cuentas`);
  if (!nombres) redirect(`/crm/clientas/ficha?id=${principalId}&aviso=no-fusion`);
  await anotar(yo.userId, "cliente.fusion", `Fichas fusionadas: «${nombres.b}» dentro de «${nombres.a}»`);
  redirect(`/crm/clientas/ficha?id=${principalId}&aviso=fusionada`);
}

/**
 * Derecho de supresión (RGPD). La ficha se anonimiza: se borran nombre, contacto, notas y
 * etiquetas, y las notas de sus citas. Las citas quedan para las estadísticas, sin datos
 * personales. No se puede si tiene citas pendientes.
 */
export async function borrarClienta(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("clientas.rgpd");
  const id = String(formData.get("id") ?? "");
  const c = await db.select({ borrada: cliente.borradaAt }).from(cliente).where(eq(cliente.id, id)).limit(1);
  if (!c[0] || c[0].borrada) redirect("/crm/clientas");

  const [pendiente] = await db
    .select({ id: cita.id })
    .from(cita)
    .where(and(eq(cita.clienteId, id), eq(cita.estado, "confirmada"), gt(cita.inicio, new Date())))
    .limit(1);
  if (pendiente) redirect(`/crm/clientas/ficha?id=${id}&aviso=pendientes`);

  await db.transaction(async (tx) => {
    await tx.update(cita).set({ notas: null }).where(eq(cita.clienteId, id));
    await tx
      .update(cliente)
      .set({
        nombre: "Clienta eliminada",
        telefono: null,
        email: null,
        etiquetas: [],
        notas: null,
        factusolCodigo: null,
        userId: null,
        consentimientoMarketing: false,
        consentimientoMarketingAt: null,
        borradaAt: new Date(),
      })
      .where(eq(cliente.id, id));
  });
  // DEBT: cuando haya cuentas web de clientas, borrar también su usuario y sesiones.
  // El registro de actividad no guarda el nombre, solo que se ha ejercido el derecho.
  await anotar(yo.userId, "cliente.borrado", "Ficha de clienta borrada a petición (RGPD)");
  redirect("/crm/clientas?aviso=borrada");
}
