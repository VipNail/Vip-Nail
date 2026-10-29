import "server-only";
import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { ajustesReserva, bloqueo, cita, horario, servicio, staff, staffServicio } from "@/db/schema";
import { calcularHuecos, type Hueco } from "./motor";
import { madridAUtc, sumarDias } from "./tiempo";

export const AJUSTES_POR_DEFECTO = {
  antelacionMinMin: 120,
  ventanaMaxDias: 60,
  limiteCancelacionHoras: 24,
  pasoMin: 15,
};
export type Ajustes = typeof AJUSTES_POR_DEFECTO;

export async function leerAjustes(): Promise<Ajustes & { id?: string }> {
  const [fila] = await db.select().from(ajustesReserva).limit(1);
  return fila ?? AJUSTES_POR_DEFECTO;
}

export async function listarServicios(incluirArchivados = false) {
  return db
    .select()
    .from(servicio)
    .where(incluirArchivados ? undefined : eq(servicio.activo, true))
    .orderBy(asc(servicio.orden), asc(servicio.nombre));
}

export async function obtenerServicio(id: string) {
  const [s] = await db.select().from(servicio).where(eq(servicio.id, id)).limit(1);
  if (!s) return null;
  const quien = await db
    .select({ staffId: staffServicio.staffId })
    .from(staffServicio)
    .where(eq(staffServicio.servicioId, id));
  return { ...s, staffIds: quien.map((q) => q.staffId) };
}

/** Personas del equipo activas (las que pueden tener agenda). */
export async function listarPersonasActivas() {
  return db
    .select({ id: staff.id, nombre: staff.nombre, colorAgenda: staff.colorAgenda, rol: staff.rol })
    .from(staff)
    .where(eq(staff.activo, true))
    .orderBy(asc(staff.nombre));
}

export async function horarioDe(staffId: string) {
  return db
    .select({ diaSemana: horario.diaSemana, inicioMin: horario.inicioMin, finMin: horario.finMin })
    .from(horario)
    .where(eq(horario.staffId, staffId))
    .orderBy(asc(horario.diaSemana), asc(horario.inicioMin));
}

/** Todos los horarios, agrupados por persona. */
export async function horariosPorPersona() {
  const filas = await db
    .select({ staffId: horario.staffId, diaSemana: horario.diaSemana, inicioMin: horario.inicioMin, finMin: horario.finMin })
    .from(horario)
    .orderBy(asc(horario.diaSemana), asc(horario.inicioMin));
  const mapa = new Map<string, typeof filas>();
  for (const f of filas) mapa.set(f.staffId, [...(mapa.get(f.staffId) ?? []), f]);
  return mapa;
}

/** Bloqueos que aún no han terminado (los pasados no interesan en la lista). */
export async function listarBloqueosVigentes(ahora = new Date()) {
  return db
    .select({
      id: bloqueo.id,
      staffId: bloqueo.staffId,
      persona: staff.nombre,
      inicio: bloqueo.inicio,
      fin: bloqueo.fin,
      motivo: bloqueo.motivo,
    })
    .from(bloqueo)
    .leftJoin(staff, eq(staff.id, bloqueo.staffId))
    .where(gt(bloqueo.fin, ahora))
    .orderBy(asc(bloqueo.inicio));
}

/**
 * Huecos libres de un servicio un día concreto. staffId = persona elegida, o null para
 * «sin preferencia». Lee la BD y delega el cálculo en el motor.
 */
export async function huecosDelDia(opciones: {
  servicioId: string;
  fecha: string;
  staffId: string | null;
  ahora?: Date;
  ignorarCitaId?: string;
}): Promise<{ huecos: Hueco[]; profesionales: number }> {
  const s = await obtenerServicio(opciones.servicioId);
  if (!s || !s.activo) return { huecos: [], profesionales: 0 };

  let staffIds = s.staffIds;
  if (opciones.staffId) staffIds = staffIds.filter((x) => x === opciones.staffId);
  if (staffIds.length) {
    const activas = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(inArray(staff.id, staffIds), eq(staff.activo, true)));
    staffIds = activas.map((a) => a.id);
  }
  if (!staffIds.length) return { huecos: [], profesionales: 0 };

  // Margen amplio alrededor del día para no perder citas o bloqueos que lo pisan.
  const desde = madridAUtc(sumarDias(opciones.fecha, -1), 0);
  const hasta = madridAUtc(sumarDias(opciones.fecha, 2), 0);

  const [horarios, citas, bloqueos, ajustes] = await Promise.all([
    db
      .select({ staffId: horario.staffId, diaSemana: horario.diaSemana, inicioMin: horario.inicioMin, finMin: horario.finMin })
      .from(horario)
      .where(inArray(horario.staffId, staffIds)),
    db
      .select({ id: cita.id, staffId: cita.staffId, inicio: cita.inicio, fin: cita.fin, margenMin: cita.margenMin })
      .from(cita)
      .where(and(inArray(cita.staffId, staffIds), ne(cita.estado, "cancelada"), lt(cita.inicio, hasta), gt(cita.fin, desde))),
    db
      .select({ staffId: bloqueo.staffId, inicio: bloqueo.inicio, fin: bloqueo.fin })
      .from(bloqueo)
      .where(and(lt(bloqueo.inicio, hasta), gt(bloqueo.fin, desde))),
    leerAjustes(),
  ]);

  const huecos = calcularHuecos({
    fecha: opciones.fecha,
    servicio: { duracionMin: s.duracionMin, margenMin: s.margenMin },
    profesionales: staffIds.map((id) => ({ staffId: id, horario: horarios.filter((h) => h.staffId === id) })),
    citas,
    bloqueos,
    ajustes,
    ahora: opciones.ahora ?? new Date(),
    ignorarCitaId: opciones.ignorarCitaId,
  });
  return { huecos, profesionales: staffIds.length };
}
