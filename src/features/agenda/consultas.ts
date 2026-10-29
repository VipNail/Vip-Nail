import "server-only";
import { and, asc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { bloqueo, cita, cliente, horario, servicio, staff } from "@/db/schema";
import { diaSemana, madridAUtc, sumarDias } from "@/features/reservas/tiempo";

export type CitaAgenda = {
  tipo: "cita";
  id: string;
  inicio: Date;
  fin: Date;
  estado: (typeof cita.$inferSelect)["estado"];
  origen: (typeof cita.$inferSelect)["origen"];
  servicio: string;
  clienta: string;
  telefono: string | null;
};
export type BloqueoAgenda = { tipo: "bloqueo"; id: string; inicio: Date; fin: Date; motivo: string; todoElEstudio: boolean };

export type ColumnaAgenda = {
  staffId: string;
  nombre: string;
  color: string;
  franjas: { inicioMin: number; finMin: number }[];
  elementos: (CitaAgenda | BloqueoAgenda)[];
};

/**
 * Agenda de un día: una columna por persona que trabaja ese día o tiene citas.
 * soloStaffId limita a una persona (filtro o profesional viendo su propia agenda).
 */
export async function agendaDelDia(fecha: string, soloStaffId?: string | null): Promise<ColumnaAgenda[]> {
  const desde = madridAUtc(fecha, 0);
  const hasta = madridAUtc(sumarDias(fecha, 1), 0);
  const filtroStaff = soloStaffId ? eq(staff.id, soloStaffId) : undefined;

  const [personas, franjas, citas, bloqueos] = await Promise.all([
    db
      .select({ id: staff.id, nombre: staff.nombre, color: staff.colorAgenda })
      .from(staff)
      .where(and(eq(staff.activo, true), filtroStaff))
      .orderBy(asc(staff.nombre)),
    db
      .select({ staffId: horario.staffId, inicioMin: horario.inicioMin, finMin: horario.finMin })
      .from(horario)
      .where(eq(horario.diaSemana, diaSemana(fecha)))
      .orderBy(asc(horario.inicioMin)),
    db
      .select({
        id: cita.id,
        staffId: cita.staffId,
        inicio: cita.inicio,
        fin: cita.fin,
        estado: cita.estado,
        origen: cita.origen,
        servicio: servicio.nombre,
        clienta: cliente.nombre,
        telefono: cliente.telefono,
      })
      .from(cita)
      .innerJoin(servicio, eq(servicio.id, cita.servicioId))
      .innerJoin(cliente, eq(cliente.id, cita.clienteId))
      .where(and(lt(cita.inicio, hasta), gt(cita.fin, desde), soloStaffId ? eq(cita.staffId, soloStaffId) : undefined))
      .orderBy(asc(cita.inicio)),
    db
      .select({ id: bloqueo.id, staffId: bloqueo.staffId, inicio: bloqueo.inicio, fin: bloqueo.fin, motivo: bloqueo.motivo })
      .from(bloqueo)
      .where(
        and(
          lt(bloqueo.inicio, hasta),
          gt(bloqueo.fin, desde),
          soloStaffId ? or(isNull(bloqueo.staffId), eq(bloqueo.staffId, soloStaffId)) : undefined,
        ),
      ),
  ]);

  return personas
    .map((p) => {
      const elementos: ColumnaAgenda["elementos"] = [
        ...citas.filter((c) => c.staffId === p.id).map((c) => ({ tipo: "cita" as const, ...c })),
        ...bloqueos
          .filter((b) => b.staffId === null || b.staffId === p.id)
          .map((b) => ({
            tipo: "bloqueo" as const,
            id: b.id,
            // Recortado al día que se está viendo.
            inicio: b.inicio < desde ? desde : b.inicio,
            fin: b.fin > hasta ? hasta : b.fin,
            motivo: b.motivo,
            todoElEstudio: b.staffId === null,
          })),
      ].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
      return {
        staffId: p.id,
        nombre: p.nombre,
        color: p.color,
        franjas: franjas.filter((f) => f.staffId === p.id).map(({ inicioMin, finMin }) => ({ inicioMin, finMin })),
        elementos,
      };
    })
    .filter((c) => soloStaffId || c.franjas.length > 0 || c.elementos.some((e) => e.tipo === "cita"));
}

export async function obtenerCita(id: string) {
  const [c] = await db
    .select({
      id: cita.id,
      inicio: cita.inicio,
      fin: cita.fin,
      margenMin: cita.margenMin,
      estado: cita.estado,
      origen: cita.origen,
      notas: cita.notas,
      createdAt: cita.createdAt,
      servicioId: cita.servicioId,
      servicio: servicio.nombre,
      staffId: cita.staffId,
      persona: staff.nombre,
      clienteId: cita.clienteId,
      clienta: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email,
    })
    .from(cita)
    .innerJoin(servicio, eq(servicio.id, cita.servicioId))
    .innerJoin(staff, eq(staff.id, cita.staffId))
    .innerJoin(cliente, eq(cliente.id, cita.clienteId))
    .where(eq(cita.id, id))
    .limit(1);
  return c ?? null;
}
