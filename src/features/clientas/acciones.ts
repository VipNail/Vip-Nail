"use server";
// Fichas de clientas desde el CRM: alta/edición, fusión de duplicadas y borrado (RGPD).
import { and, eq, gt, inArray, isNull, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accesoCurso, actividad, cita, cliente, enlaceCuenta, pedido, plaza, progreso, staff, user } from "@/db/schema";
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
      .select({ consiente: cliente.consentimientoMarketing, borrada: cliente.borradaAt, userId: cliente.userId })
      .from(cliente)
      .where(eq(cliente.id, id))
      .limit(1);
    if (!antes || antes.borrada) return { error: "Esta ficha ya no existe." };
    if (antes.userId) {
      // Tiene cuenta de alumna: el email es con el que entra, así que cambia también ahí.
      if (!email) return { error: "Tiene cuenta de alumna: el email no se puede dejar vacío (es con lo que entra)." };
      const [ocupado] = await db.select({ id: user.id }).from(user).where(and(eq(user.email, email), ne(user.id, antes.userId))).limit(1);
      if (ocupado) return { error: "Ese email ya lo usa otra cuenta." };
      await db.update(user).set({ email, name: d.nombre }).where(eq(user.id, antes.userId));
    }
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
 * pedidos, cursos y plazas), completa los datos que faltan, une etiquetas y notas, y borra la duplicada.
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
    await tx.update(pedido).set({ clienteId: a.id }).where(eq(pedido.clienteId, b.id));
    // Cursos online: si las dos tenían el mismo curso, se queda el acceso de la principal.
    const suyos = await tx.select({ cursoId: accesoCurso.cursoId }).from(accesoCurso).where(eq(accesoCurso.clienteId, a.id));
    const repetidos = suyos.map((x) => x.cursoId);
    if (repetidos.length) await tx.delete(accesoCurso).where(and(eq(accesoCurso.clienteId, b.id), inArray(accesoCurso.cursoId, repetidos)));
    await tx.update(accesoCurso).set({ clienteId: a.id }).where(eq(accesoCurso.clienteId, b.id));
    await tx.update(plaza).set({ clienteId: a.id }).where(eq(plaza.clienteId, b.id));
    // Lecciones vistas: se suman (las que ya tenía vistas la principal se quedan como están).
    const vistas = (await tx.select({ id: progreso.leccionId }).from(progreso).where(eq(progreso.clienteId, a.id))).map((x) => x.id);
    if (vistas.length) await tx.delete(progreso).where(and(eq(progreso.clienteId, b.id), inArray(progreso.leccionId, vistas)));
    await tx.update(progreso).set({ clienteId: a.id }).where(eq(progreso.clienteId, b.id));

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
  const [abierto] = await db
    .select({ id: pedido.id })
    .from(pedido)
    .where(and(eq(pedido.clienteId, id), inArray(pedido.estado, ["pagado", "preparando"]), ne(pedido.envioTipo, "sin_envio")))
    .limit(1);
  if (abierto) redirect(`/crm/clientas/ficha?id=${id}&aviso=pedidos-abiertos`);

  const [ficha] = await db.select({ userId: cliente.userId }).from(cliente).where(eq(cliente.id, id)).limit(1);
  await db.transaction(async (tx) => {
    await tx.update(cita).set({ notas: null }).where(eq(cita.clienteId, id));
    await tx.delete(enlaceCuenta).where(eq(enlaceCuenta.clienteId, id));
    await tx.delete(accesoCurso).where(eq(accesoCurso.clienteId, id));
    await tx.delete(progreso).where(eq(progreso.clienteId, id));
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
  // Los pedidos se conservan con sus datos de facturación: obligación legal de conservar la
  // documentación contable (art. 17.3.b RGPD y art. 30 del Código de Comercio).
  // Su cuenta de alumna (usuario, sesiones y contraseña) se borra, salvo que sea también del equipo.
  if (ficha?.userId) {
    const [esEquipo] = await db.select({ id: staff.id }).from(staff).where(eq(staff.userId, ficha.userId)).limit(1);
    if (!esEquipo) await db.delete(user).where(eq(user.id, ficha.userId));
  }
  // El registro de actividad no guarda el nombre, solo que se ha ejercido el derecho.
  await anotar(yo.userId, "cliente.borrado", "Ficha de clienta borrada a petición (RGPD)");
  redirect("/crm/clientas?aviso=borrada");
}
