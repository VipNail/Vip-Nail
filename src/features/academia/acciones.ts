"use server";
// Academia desde el CRM (administración y formadoras).
import { and, count, eq, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accesoCurso, actividad, cliente, convocatoria, curso, leccion, plaza, TIPOS_IVA } from "@/db/schema";
import { buscarOCrearCliente, normalizarTelefono } from "@/features/clientas/buscar";
import { localAUtc } from "@/features/reservas/tiempo";
import { euros, leerEuros } from "@/features/tienda/precios";
import { exigirEquipo } from "@/lib/sesion";
import { aSlug } from "@/lib/texto";
import { leerVimeo, plazasLibres } from "./logica";

export type EstadoFormulario = { error?: string };
const ULID = z.string().length(26);

async function anotar(userId: string, tipo: string, descripcion: string) {
  await db.insert(actividad).values({ userId, tipo, descripcion: descripcion.slice(0, 255) });
}

async function slugLibre(base: string, idActual?: string) {
  const raiz = aSlug(base);
  for (let n = 1; ; n++) {
    const s = n === 1 ? raiz : `${raiz}-${n}`;
    const [o] = await db.select({ id: curso.id }).from(curso).where(idActual ? and(eq(curso.slug, s), ne(curso.id, idActual)) : eq(curso.slug, s)).limit(1);
    if (!o) return s;
  }
}

// ── Cursos ───────────────────────────────────────────────────────────────────

const EsquemaCurso = z.object({
  id: ULID.optional().or(z.literal("")),
  tipo: z.enum(["online", "presencial"]),
  titulo: z.string().trim().min(3, "Pon el título.").max(160),
  resumen: z.string().trim().max(300),
  descripcion: z.string().trim().max(20000),
  precio: z.string(),
  tipoIva: z.coerce.number().refine((v) => (TIPOS_IVA as readonly number[]).includes(v), "IVA no válido."),
  nivel: z.string().trim().max(60),
  duracion: z.string().trim().max(60),
  orden: z.coerce.number().int().min(0).max(9999).catch(0),
});

export async function guardarCurso(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("cursos.gestionar");
  const r = EsquemaCurso.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  const precio = leerEuros(d.precio);
  if (precio === null || precio <= 0) return { error: "Precio no válido (por ejemplo: 35)." };
  const datos = {
    titulo: d.titulo,
    resumen: d.resumen || null,
    descripcion: d.descripcion || null,
    precio,
    tipoIva: d.tipoIva,
    nivel: d.nivel || null,
    duracion: d.duracion || null,
    orden: d.orden,
    visible: formData.get("visible") === "on",
  };
  let id = d.id || undefined;
  if (id) {
    await db.update(curso).set({ ...datos, slug: await slugLibre(d.titulo, id) }).where(eq(curso.id, id));
  } else {
    const [n] = await db.insert(curso).values({ ...datos, tipo: d.tipo, slug: await slugLibre(d.titulo) }).$returningId();
    id = n.id;
  }
  await anotar(yo.userId, d.id ? "curso.edicion" : "curso.alta", `${d.id ? "Curso editado" : "Curso nuevo"}: ${d.titulo} · ${euros(precio)}`);
  redirect(`/crm/cursos/ver?id=${id}&aviso=guardado`);
}

// ── Lecciones (cursos online) ────────────────────────────────────────────────

const EsquemaLeccion = z.object({
  id: ULID.optional().or(z.literal("")),
  cursoId: ULID,
  modulo: z.string().trim().max(120),
  titulo: z.string().trim().min(2, "Pon el título de la lección.").max(160),
  orden: z.coerce.number().int().min(0).max(9999).catch(0),
  vimeo: z.string().trim().max(300),
  duracionMin: z.string().trim().regex(/^\d{0,4}$/, "Duración en minutos, sin decimales."),
  descripcion: z.string().trim().max(5000),
});

export async function guardarLeccion(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("cursos.gestionar");
  const r = EsquemaLeccion.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  let vimeo: { id: string; hash: string | null } | null = null;
  if (d.vimeo) {
    vimeo = leerVimeo(d.vimeo);
    if (!vimeo) return { error: "No reconozco ese enlace de Vimeo. Copia el enlace del vídeo (vimeo.com/…)." };
  }
  const [c] = await db.select({ tipo: curso.tipo, titulo: curso.titulo }).from(curso).where(eq(curso.id, d.cursoId)).limit(1);
  if (!c || c.tipo !== "online") return { error: "Las lecciones son solo para cursos online." };
  const datos = {
    modulo: d.modulo || null,
    titulo: d.titulo,
    orden: d.orden,
    vimeoId: vimeo?.id ?? null,
    vimeoHash: vimeo?.hash ?? null,
    duracionMin: d.duracionMin ? Number(d.duracionMin) : null,
    descripcion: d.descripcion || null,
  };
  if (d.id) await db.update(leccion).set(datos).where(and(eq(leccion.id, d.id), eq(leccion.cursoId, d.cursoId)));
  else await db.insert(leccion).values({ ...datos, cursoId: d.cursoId });
  await anotar(yo.userId, "leccion.guardar", `Lección guardada en «${c.titulo}»: ${d.titulo}`);
  redirect(`/crm/cursos/ver?id=${d.cursoId}&aviso=leccion#lecciones`);
}

export async function borrarLeccion(formData: FormData): Promise<void> {
  await exigirEquipo("cursos.gestionar");
  const id = String(formData.get("id") ?? "");
  const cursoId = String(formData.get("cursoId") ?? "");
  await db.delete(leccion).where(and(eq(leccion.id, id), eq(leccion.cursoId, cursoId)));
  redirect(`/crm/cursos/ver?id=${cursoId}&aviso=leccion-borrada#lecciones`);
}

// ── Acceso manual a cursos online ────────────────────────────────────────────

/** Da acceso a una clienta que ya tiene ficha (regalo, pago en el estudio, migración). */
export async function darAcceso(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("cursos.gestionar");
  const cursoId = String(formData.get("cursoId") ?? "");
  const contacto = String(formData.get("contacto") ?? "").trim();
  const volver = `/crm/cursos/ver?id=${cursoId}`;
  const tel = normalizarTelefono(contacto);
  const [c] = await db
    .select({ id: cliente.id, nombre: cliente.nombre })
    .from(cliente)
    .where(or(eq(cliente.email, contacto.toLowerCase()), tel ? eq(cliente.telefono, tel) : undefined))
    .limit(1);
  if (!c) redirect(`${volver}&aviso=sin-clienta#alumnas`);
  const [ya] = await db.select({ id: accesoCurso.id }).from(accesoCurso).where(and(eq(accesoCurso.clienteId, c.id), eq(accesoCurso.cursoId, cursoId))).limit(1);
  if (ya) redirect(`${volver}&aviso=ya-tiene#alumnas`);
  await db.insert(accesoCurso).values({ clienteId: c.id, cursoId, origen: "manual", desde: new Date() });
  await anotar(yo.userId, "curso.acceso", `Acceso manual a un curso online: ${c.nombre}`);
  redirect(`${volver}&aviso=acceso#alumnas`);
}

export async function quitarAcceso(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("cursos.gestionar");
  const id = String(formData.get("id") ?? "");
  const cursoId = String(formData.get("cursoId") ?? "");
  await db.delete(accesoCurso).where(and(eq(accesoCurso.id, id), eq(accesoCurso.cursoId, cursoId)));
  await anotar(yo.userId, "curso.acceso-quitado", "Acceso a curso online quitado");
  redirect(`/crm/cursos/ver?id=${cursoId}&aviso=acceso-quitado#alumnas`);
}

// ── Convocatorias (cursos presenciales) ──────────────────────────────────────

const EsquemaConvocatoria = z.object({
  id: ULID.optional().or(z.literal("")),
  cursoId: ULID,
  inicio: z.string(),
  fin: z.string(),
  horario: z.string().trim().max(160),
  lugar: z.string().trim().max(160),
  plazas: z.coerce.number("Plazas no válidas.").int().min(1, "Al menos 1 plaza.").max(200),
  senal: z.string().trim(),
});

export async function guardarConvocatoria(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("cursos.gestionar");
  const r = EsquemaConvocatoria.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  const inicio = localAUtc(d.inicio);
  const fin = localAUtc(d.fin);
  if (!inicio || !fin) return { error: "Pon el día y la hora de inicio y de fin." };
  if (fin <= inicio) return { error: "El curso tiene que acabar después de empezar." };
  const [c] = await db.select({ tipo: curso.tipo, titulo: curso.titulo, precio: curso.precio }).from(curso).where(eq(curso.id, d.cursoId)).limit(1);
  if (!c || c.tipo !== "presencial") return { error: "Las fechas son solo para cursos presenciales." };
  let precioSenal: number | null = null;
  if (d.senal) {
    precioSenal = leerEuros(d.senal);
    if (precioSenal === null || precioSenal <= 0) return { error: "Señal no válida (por ejemplo: 50)." };
    if (precioSenal >= c.precio) return { error: `La señal tiene que ser menor que el precio del curso (${euros(c.precio)}).` };
  }
  const datos = { inicio, fin, horario: d.horario || null, lugar: d.lugar || null, plazas: d.plazas, precioSenal };
  if (d.id) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(plaza)
      .where(and(eq(plaza.convocatoriaId, d.id), or(eq(plaza.estado, "pagada"), eq(plaza.estado, "senal_pagada"))));
    if (d.plazas < n) return { error: `Ya hay ${n} plazas pagadas: no puedes poner menos.` };
    await db.update(convocatoria).set(datos).where(eq(convocatoria.id, d.id));
  } else await db.insert(convocatoria).values({ ...datos, cursoId: d.cursoId });
  await anotar(yo.userId, "convocatoria.guardar", `Fechas de «${c.titulo}» guardadas (${d.plazas} plazas)`);
  redirect(`/crm/cursos/ver?id=${d.cursoId}&aviso=convocatoria#fechas`);
}

export async function cambiarEstadoConvocatoria(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("cursos.gestionar");
  const id = String(formData.get("id") ?? "");
  const estado = z.enum(["abierta", "cerrada", "cancelada"]).safeParse(formData.get("estado"));
  if (!estado.success) redirect("/crm/cursos");
  await db.update(convocatoria).set({ estado: estado.data }).where(eq(convocatoria.id, id));
  await anotar(yo.userId, "convocatoria.estado", `Convocatoria ${estado.data}`);
  redirect(`/crm/cursos/convocatoria?id=${id}&aviso=${estado.data}`);
}

// ── Plazas ───────────────────────────────────────────────────────────────────

/** Apunta a una alumna desde el estudio (pagado en mano o pendiente de pagar el resto). */
export async function apuntarAlumna(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("cursos.gestionar");
  const convocatoriaId = String(formData.get("convocatoriaId") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const pago = String(formData.get("pago") ?? "");
  if (nombre.length < 2) return { error: "Pon el nombre de la alumna." };
  if (!telefono && !email) return { error: "Pon al menos el teléfono o el email." };
  if (pago !== "pagada" && pago !== "senal_pagada") return { error: "Indica qué ha pagado." };

  const r = await db.transaction(async (tx) => {
    const [c] = await tx
      .select({ conv: convocatoria, precio: curso.precio, senal: convocatoria.precioSenal, titulo: curso.titulo })
      .from(convocatoria)
      .innerJoin(curso, eq(curso.id, convocatoria.cursoId))
      .where(eq(convocatoria.id, convocatoriaId))
      .for("update");
    if (!c) return { error: "Esa convocatoria ya no existe." };
    const ocupadas = await tx.select({ estado: plaza.estado, caducaAt: plaza.caducaAt }).from(plaza).where(eq(plaza.convocatoriaId, convocatoriaId));
    if (plazasLibres(c.conv.plazas, ocupadas, new Date()) <= 0) return { error: "No quedan plazas libres." };
    const cl = await buscarOCrearCliente(tx, { nombre, telefono, email });
    await tx.insert(plaza).values({
      convocatoriaId,
      clienteId: cl.id,
      estado: pago as "pagada" | "senal_pagada",
      modalidad: pago === "pagada" ? "total" : "senal",
      importePagado: pago === "pagada" ? c.precio : (c.senal ?? 0),
      notas: "Apuntada desde el estudio",
    });
    return { ok: `${cl.nombre} en «${c.titulo}»` };
  });
  if ("error" in r && r.error) return { error: r.error };
  await anotar(yo.userId, "plaza.alta", `Plaza apuntada desde el estudio: ${r.ok}`);
  redirect(`/crm/cursos/convocatoria?id=${convocatoriaId}&aviso=apuntada`);
}

export async function cambiarPlaza(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("cursos.gestionar");
  const id = String(formData.get("id") ?? "");
  const accion = String(formData.get("accion") ?? "");
  const [p] = await db
    .select({ p: plaza, precio: curso.precio, convId: convocatoria.id })
    .from(plaza)
    .innerJoin(convocatoria, eq(convocatoria.id, plaza.convocatoriaId))
    .innerJoin(curso, eq(curso.id, convocatoria.cursoId))
    .where(eq(plaza.id, id))
    .limit(1);
  if (!p) redirect("/crm/cursos");
  if (accion === "resto" && p.p.estado === "senal_pagada") {
    await db.update(plaza).set({ estado: "pagada", importePagado: p.precio }).where(eq(plaza.id, id));
    await anotar(yo.userId, "plaza.pagada", `Plaza pagada del todo (resto: ${euros(p.precio - p.p.importePagado)})`);
  } else if (accion === "cancelar" && p.p.estado !== "cancelada") {
    await db.update(plaza).set({ estado: "cancelada", caducaAt: null }).where(eq(plaza.id, id));
    await anotar(yo.userId, "plaza.cancelada", `Plaza cancelada${p.p.importePagado ? ` (pagado ${euros(p.p.importePagado)}: devolver si procede)` : ""}`);
  }
  redirect(`/crm/cursos/convocatoria?id=${p.convId}&aviso=plaza`);
}

// ── Datos de ejemplo ─────────────────────────────────────────────────────────

export async function cargarEjemploAcademia(): Promise<void> {
  const yo = await exigirEquipo("cursos.gestionar");
  const [{ n }] = await db.select({ n: count() }).from(curso);
  if (n > 0) redirect("/crm/cursos");
  // Títulos de la web actual (inventario de migración); precios de los presenciales inventados.
  const online = [
    ["Degradado con pincel (ejemplo)", 3000, 4],
    ["Decoración básica (ejemplo)", 3500, 15],
    ["Manicura combinada semipermanente PRO (ejemplo)", 4000, 6],
  ] as const;
  await db.transaction(async (tx) => {
    let orden = 0;
    for (const [titulo, precio, nLecciones] of online) {
      const [c] = await tx
        .insert(curso)
        .values({ tipo: "online", titulo, slug: aSlug(titulo), precio, resumen: "Curso online de ejemplo con lecciones en vídeo.", duracion: `${nLecciones} lecciones`, nivel: "Iniciación", orden: orden++ })
        .$returningId();
      await tx.insert(leccion).values(
        Array.from({ length: nLecciones }, (_, i) => ({
          cursoId: c.id,
          modulo: i < 2 ? "Introducción" : "Práctica",
          titulo: `Lección ${i + 1}`,
          orden: i + 1,
          duracionMin: 8 + i,
        })),
      );
    }
    const presenciales = [
      ["Básico de manicura con semipermanente (ejemplo)", 25000, 5000, "2 días", 14, 6],
      ["Perfeccionamiento gel y acrygel (ejemplo)", 15000, 4000, "1 día", 28, 4],
    ] as const;
    for (const [titulo, precio, senal, duracion, enDias, plazas] of presenciales) {
      const [c] = await tx
        .insert(curso)
        .values({ tipo: "presencial", titulo, slug: aSlug(titulo), precio, resumen: "Curso presencial de ejemplo en el estudio.", duracion, nivel: "Todos los niveles", orden: orden++ })
        .$returningId();
      const inicio = new Date(Date.now() + enDias * 86_400_000);
      inicio.setUTCHours(8, 0, 0, 0);
      const fin = new Date(inicio.getTime() + (duracion === "2 días" ? 33 : 9) * 3_600_000);
      await tx.insert(convocatoria).values({ cursoId: c.id, inicio, fin, horario: "De 10:00 a 18:00", lugar: "VIP Nail Studio", plazas, precioSenal: senal });
    }
  });
  await anotar(yo.userId, "academia.ejemplo", "Cursos de ejemplo cargados (3 online y 2 presenciales)");
  redirect("/crm/cursos?aviso=ejemplo");
}
