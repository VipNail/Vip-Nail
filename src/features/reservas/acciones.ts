"use server";
// Configuración de reservas desde el CRM. Cada acción comprueba el permiso en servidor.
import { and, count, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { actividad, ajustesReserva, bloqueo, horario, servicio, staff, staffServicio } from "@/db/schema";
import { exigirEquipo } from "@/lib/sesion";
import { leerAjustes } from "./consultas";
import { aHora, aMinutos, horaMadrid, localAUtc, fechaMadrid } from "./tiempo";

export type EstadoFormulario = { error?: string };

async function anotar(userId: string, tipo: string, descripcion: string) {
  await db.insert(actividad).values({ userId, tipo, descripcion: descripcion.slice(0, 255) });
}

function aSlug(texto: string) {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "servicio"
  );
}

async function slugLibre(nombre: string, idActual?: string) {
  const base = aSlug(nombre);
  for (let n = 1; ; n++) {
    const candidato = n === 1 ? base : `${base}-${n}`;
    const [ocupado] = await db
      .select({ id: servicio.id })
      .from(servicio)
      .where(idActual ? and(eq(servicio.slug, candidato), ne(servicio.id, idActual)) : eq(servicio.slug, candidato))
      .limit(1);
    if (!ocupado) return candidato;
  }
}

// ── Servicios ────────────────────────────────────────────────────────────────

const EsquemaServicio = z.object({
  id: z.string().length(26).optional().or(z.literal("")),
  nombre: z.string().trim().min(2, "Pon el nombre del servicio.").max(120),
  categoria: z.string().trim().max(80),
  descripcion: z.string().trim().max(2000),
  duracionMin: z.coerce.number("Duración no válida.").int().min(5, "La duración mínima es de 5 minutos.").max(600, "La duración máxima es de 10 horas."),
  margenMin: z.coerce.number("Margen no válido.").int().min(0).max(120, "El margen máximo es de 120 minutos."),
  orden: z.coerce.number().int().min(0).max(9999).catch(0),
});

export async function guardarServicio(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("reservas.configurar");
  const r = EsquemaServicio.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  const visible = formData.get("visible") === "on";
  const staffIds = [...new Set(formData.getAll("staffIds").map(String))].filter((x) => x.length === 26);

  const datos = {
    nombre: d.nombre,
    categoria: d.categoria || null,
    descripcion: d.descripcion || null,
    duracionMin: d.duracionMin,
    margenMin: d.margenMin,
    orden: d.orden,
    visible,
  };

  let id = d.id || undefined;
  await db.transaction(async (tx) => {
    if (id) {
      await tx.update(servicio).set({ ...datos, slug: await slugLibre(d.nombre, id) }).where(eq(servicio.id, id));
      await tx.delete(staffServicio).where(eq(staffServicio.servicioId, id));
    } else {
      const [nuevo] = await tx
        .insert(servicio)
        .values({ ...datos, slug: await slugLibre(d.nombre) })
        .$returningId();
      id = nuevo.id;
    }
    if (staffIds.length) await tx.insert(staffServicio).values(staffIds.map((s) => ({ staffId: s, servicioId: id! })));
  });

  await anotar(yo.userId, d.id ? "servicio.edicion" : "servicio.alta", `${d.id ? "Servicio editado" : "Servicio nuevo"}: ${d.nombre} (${d.duracionMin} min)`);
  redirect("/crm/reservas/servicios?aviso=guardado");
}

export async function cambiarArchivoServicio(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("reservas.configurar");
  const id = String(formData.get("id") ?? "");
  const activar = formData.get("activar") === "1";
  const [s] = await db.select({ nombre: servicio.nombre }).from(servicio).where(eq(servicio.id, id)).limit(1);
  if (!s) redirect("/crm/reservas/servicios");
  await db.update(servicio).set({ activo: activar }).where(eq(servicio.id, id));
  await anotar(yo.userId, activar ? "servicio.recuperar" : "servicio.archivar", `Servicio ${activar ? "recuperado" : "archivado"}: ${s.nombre}`);
  redirect(`/crm/reservas/servicios?aviso=${activar ? "recuperado" : "archivado"}`);
}

// ── Horarios ─────────────────────────────────────────────────────────────────

const NOMBRE_DIA = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export async function guardarHorario(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("reservas.configurar");
  const staffId = String(formData.get("staffId") ?? "");
  const [persona] = await db.select({ nombre: staff.nombre }).from(staff).where(eq(staff.id, staffId)).limit(1);
  if (!persona) return { error: "Esa persona ya no existe." };

  const franjas: { diaSemana: number; inicioMin: number; finMin: number }[] = [];
  for (let dia = 1; dia <= 7; dia++) {
    const delDia: { inicioMin: number; finMin: number }[] = [];
    for (let k = 1; k <= 2; k++) {
      const i = String(formData.get(`d${dia}_i${k}`) ?? "").trim();
      const f = String(formData.get(`d${dia}_f${k}`) ?? "").trim();
      if (!i && !f) continue;
      const ini = aMinutos(i);
      const fin = aMinutos(f);
      if (ini === null || fin === null) return { error: `El ${NOMBRE_DIA[dia]} tiene una franja incompleta: pon hora de entrada y de salida.` };
      if (fin <= ini) return { error: `El ${NOMBRE_DIA[dia]}: la hora de salida tiene que ser posterior a la de entrada.` };
      delDia.push({ inicioMin: ini, finMin: fin });
    }
    delDia.sort((a, b) => a.inicioMin - b.inicioMin);
    if (delDia.length === 2 && delDia[1].inicioMin < delDia[0].finMin)
      return { error: `El ${NOMBRE_DIA[dia]}: las dos franjas se solapan.` };
    franjas.push(...delDia.map((x) => ({ diaSemana: dia, ...x })));
  }

  await db.transaction(async (tx) => {
    await tx.delete(horario).where(eq(horario.staffId, staffId));
    if (franjas.length) await tx.insert(horario).values(franjas.map((x) => ({ staffId, ...x })));
  });

  await anotar(yo.userId, "horario.edicion", `Horario actualizado: ${persona.nombre}`);
  redirect("/crm/reservas/horarios?aviso=guardado");
}

// ── Bloqueos y vacaciones ────────────────────────────────────────────────────

export async function crearBloqueo(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("agenda.gestionar");
  const quien = String(formData.get("quien") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 160);
  const inicio = localAUtc(String(formData.get("desde") ?? ""));
  const fin = localAUtc(String(formData.get("hasta") ?? ""));

  if (!motivo) return { error: "Pon el motivo (por ejemplo: vacaciones, festivo, médico)." };
  if (!inicio || !fin) return { error: "Pon la fecha y hora de inicio y de fin." };
  if (fin <= inicio) return { error: "El final tiene que ser posterior al inicio." };

  let nombre = "todo el estudio";
  if (quien) {
    const [p] = await db.select({ nombre: staff.nombre }).from(staff).where(eq(staff.id, quien)).limit(1);
    if (!p) return { error: "Esa persona ya no existe." };
    nombre = p.nombre;
  }

  await db.insert(bloqueo).values({ staffId: quien || null, inicio, fin, motivo, creadoPor: yo.userId });
  await anotar(
    yo.userId,
    "bloqueo.alta",
    `Bloqueo (${motivo}) para ${nombre}: ${fechaMadrid(inicio)} ${horaMadrid(inicio)} → ${fechaMadrid(fin)} ${horaMadrid(fin)}`,
  );
  redirect("/crm/reservas/bloqueos?aviso=creado");
}

export async function borrarBloqueo(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("agenda.gestionar");
  const id = String(formData.get("id") ?? "");
  const [b] = await db.select({ motivo: bloqueo.motivo }).from(bloqueo).where(eq(bloqueo.id, id)).limit(1);
  if (b) {
    await db.delete(bloqueo).where(eq(bloqueo.id, id));
    await anotar(yo.userId, "bloqueo.baja", `Bloqueo quitado: ${b.motivo}`);
  }
  redirect("/crm/reservas/bloqueos?aviso=borrado");
}

// ── Ajustes ──────────────────────────────────────────────────────────────────

const PASOS = [5, 10, 15, 20, 30, 60];
const EsquemaAjustes = z.object({
  antelacionHoras: z.coerce.number("Antelación no válida.").min(0).max(168, "La antelación máxima es de 168 horas (7 días)."),
  ventanaMaxDias: z.coerce.number("Ventana no válida.").int().min(1, "Mínimo 1 día.").max(365, "Máximo 365 días."),
  limiteCancelacionHoras: z.coerce.number("Límite no válido.").int().min(0).max(168, "Máximo 168 horas."),
  pasoMin: z.coerce.number().refine((v) => PASOS.includes(v), "Elige cada cuánto empiezan las citas."),
});

export async function guardarAjustes(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("reservas.configurar");
  const r = EsquemaAjustes.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const valores = {
    antelacionMinMin: Math.round(r.data.antelacionHoras * 60),
    ventanaMaxDias: r.data.ventanaMaxDias,
    limiteCancelacionHoras: r.data.limiteCancelacionHoras,
    pasoMin: r.data.pasoMin,
  };
  const actual = await leerAjustes();
  if (actual.id) await db.update(ajustesReserva).set(valores).where(eq(ajustesReserva.id, actual.id));
  else await db.insert(ajustesReserva).values(valores);
  await anotar(yo.userId, "reservas.ajustes", "Ajustes de reserva actualizados");
  redirect("/crm/reservas/ajustes?aviso=guardado");
}

// ── Datos de ejemplo ─────────────────────────────────────────────────────────

/** Carga servicios y horarios de ejemplo si aún no hay ningún servicio. Para probar sin datos reales. */
export async function cargarEjemplo(): Promise<void> {
  const yo = await exigirEquipo("reservas.configurar");
  const [{ n }] = await db.select({ n: count() }).from(servicio);
  if (n > 0) redirect("/crm/reservas");

  const personas = await db.select({ id: staff.id }).from(staff).where(eq(staff.activo, true));
  const ejemplos = [
    { nombre: "Manicura semipermanente (ejemplo)", categoria: "Manos", duracionMin: 60, margenMin: 10, orden: 1 },
    { nombre: "Uñas acrílicas (ejemplo)", categoria: "Manos", duracionMin: 120, margenMin: 15, orden: 2 },
    { nombre: "Pedicura completa (ejemplo)", categoria: "Pies", duracionMin: 75, margenMin: 15, orden: 3 },
    { nombre: "Retirada de esmalte (ejemplo)", categoria: "Manos", duracionMin: 20, margenMin: 5, orden: 4 },
  ];

  await db.transaction(async (tx) => {
    for (const e of ejemplos) {
      const [nuevo] = await tx
        .insert(servicio)
        .values({ ...e, slug: aSlug(e.nombre), visible: true })
        .$returningId();
      if (personas.length) await tx.insert(staffServicio).values(personas.map((p) => ({ staffId: p.id, servicioId: nuevo.id })));
    }
    // Horario de ejemplo solo para quien aún no tiene: L–V 10–14 y 16–20, sábado 10–14.
    const conHorario = new Set((await tx.select({ s: horario.staffId }).from(horario)).map((x) => x.s));
    const franjas = personas
      .filter((p) => !conHorario.has(p.id))
      .flatMap((p) => [
        ...[1, 2, 3, 4, 5].flatMap((d) => [
          { staffId: p.id, diaSemana: d, inicioMin: aMinutos("10:00")!, finMin: aMinutos("14:00")! },
          { staffId: p.id, diaSemana: d, inicioMin: aMinutos("16:00")!, finMin: aMinutos("20:00")! },
        ]),
        { staffId: p.id, diaSemana: 6, inicioMin: aMinutos("10:00")!, finMin: aMinutos("14:00")! },
      ]);
    if (franjas.length) await tx.insert(horario).values(franjas);
  });

  await anotar(yo.userId, "reservas.ejemplo", `Datos de ejemplo de reservas cargados (${ejemplos.length} servicios, ${aHora(600)}–${aHora(1200)})`);
  redirect("/crm/reservas?aviso=ejemplo");
}
