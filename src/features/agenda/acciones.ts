"use server";
// Citas desde el CRM (teléfono o presencial). El hueco se vuelve a comprobar dentro de una
// transacción con la agenda de la persona bloqueada: dos personas del equipo no pueden
// apuntar a la vez la misma hora.
import { randomBytes } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { actividad, cita, staff } from "@/db/schema";
import { buscarOCrearCliente } from "@/features/clientas/buscar";
import { huecosDelDia, obtenerServicio, type Ejecutor } from "@/features/reservas/consultas";
import { fechaMadrid, horaMadrid, leerFecha } from "@/features/reservas/tiempo";
import { exigirEquipo } from "@/lib/sesion";

export type EstadoFormulario = { error?: string };

class HuecoOcupado extends Error {}

// «read committed»: tras esperar el bloqueo, cada consulta ve las citas que otra persona acaba
// de guardar. Con el nivel por defecto (repeatable read) la transacción seguiría viendo la foto
// de antes del bloqueo y se podrían apuntar dos citas a la misma hora.
const TRANSACCION = { isolationLevel: "read committed" } as const;

const MIN = 60_000;
const ULID = z.string().length(26);

async function anotar(userId: string, tipo: string, descripcion: string) {
  await db.insert(actividad).values({ userId, tipo, descripcion: descripcion.slice(0, 255) });
}

/** Bloquea la agenda de estas personas hasta que acabe la transacción (siempre en el mismo orden). */
async function bloquearAgendas(tx: Ejecutor, staffIds: string[]) {
  if (!staffIds.length) return;
  await tx.select({ id: staff.id }).from(staff).where(inArray(staff.id, staffIds)).orderBy(asc(staff.id)).for("update");
}

const fechaLegible = (d: Date) => `${fechaMadrid(d).split("-").reverse().join("/")} ${horaMadrid(d)}`;

// ── Nueva cita ───────────────────────────────────────────────────────────────

const EsquemaCita = z.object({
  servicioId: ULID,
  persona: ULID.or(z.literal("")),
  fecha: z.string().refine((f) => leerFecha(f) !== null, "Fecha no válida."),
  inicio: z.string().min(1, "Elige una hora."),
  nombre: z.string().trim().min(2, "Pon el nombre de la clienta.").max(160),
  telefono: z.string().trim().max(32),
  email: z.string().trim().max(191).refine((v) => v === "" || z.email().safeParse(v).success, "Email no válido."),
  origen: z.enum(["telefono", "presencial"], "Elige cómo ha llegado la cita."),
  notas: z.string().trim().max(1000),
});

export async function crearCita(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("agenda.gestionar");
  const r = EsquemaCita.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  if (!d.telefono && !d.email) return { error: "Pon al menos el teléfono o el email de la clienta." };
  const inicio = new Date(d.inicio);
  if (Number.isNaN(inicio.getTime())) return { error: "Elige una hora." };

  let hecho: { persona: string; clienta: string; servicio: string; nueva: boolean };
  try {
    hecho = await db.transaction(async (tx) => {
      const s = await obtenerServicio(d.servicioId, tx);
      if (!s || !s.activo) throw new HuecoOcupado();
      await bloquearAgendas(tx, d.persona ? [d.persona] : s.staffIds);

      const { huecos } = await huecosDelDia({ servicioId: s.id, fecha: d.fecha, staffId: d.persona || null, modo: "equipo" }, tx);
      const hueco = huecos.find((h) => h.inicio.getTime() === inicio.getTime());
      if (!hueco) throw new HuecoOcupado();
      const staffId = d.persona || hueco.staffIds[0];

      const c = await buscarOCrearCliente(tx, { nombre: d.nombre, telefono: d.telefono, email: d.email });
      await tx.insert(cita).values({
        clienteId: c.id,
        staffId,
        servicioId: s.id,
        inicio,
        fin: new Date(inicio.getTime() + s.duracionMin * MIN),
        margenMin: s.margenMin,
        origen: d.origen,
        tokenGestion: randomBytes(24).toString("base64url"),
        notas: d.notas || null,
      });
      const [p] = await tx.select({ nombre: staff.nombre }).from(staff).where(eq(staff.id, staffId)).limit(1);
      return { persona: p?.nombre ?? "?", clienta: c.nombre, servicio: s.nombre, nueva: c.nueva };
    }, TRANSACCION);
  } catch (e) {
    if (e instanceof HuecoOcupado) return { error: "Esa hora ya no está libre (alguien la acaba de ocupar). Elige otra." };
    throw e;
  }

  await anotar(
    yo.userId,
    "cita.alta",
    `Cita ${d.origen === "telefono" ? "por teléfono" : "presencial"}: ${hecho.clienta}${hecho.nueva ? " (nueva)" : ""} · ${hecho.servicio} · ${hecho.persona} · ${fechaLegible(inicio)}`,
  );
  redirect(`/crm/agenda?fecha=${d.fecha}&aviso=creada`);
}

// ── Cambiar de hora ──────────────────────────────────────────────────────────

export async function moverCita(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("agenda.gestionar");
  const id = String(formData.get("id") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const persona = String(formData.get("persona") ?? "");
  const inicio = new Date(String(formData.get("inicio") ?? ""));
  const volver = `/crm/agenda/cita?id=${id}`;
  if (!leerFecha(fecha) || Number.isNaN(inicio.getTime())) redirect(`${volver}&aviso=error`);

  let texto = "";
  try {
    texto = await db.transaction(async (tx) => {
      const [c] = await tx.select().from(cita).where(eq(cita.id, id)).limit(1);
      if (!c || c.estado !== "confirmada") throw new HuecoOcupado();
      const s = await obtenerServicio(c.servicioId, tx);
      if (!s) throw new HuecoOcupado();
      await bloquearAgendas(tx, [...new Set([c.staffId, ...(persona ? [persona] : s.staffIds)])]);

      const { huecos } = await huecosDelDia(
        { servicioId: s.id, fecha, staffId: persona || null, ignorarCitaId: id, modo: "equipo" },
        tx,
      );
      const hueco = huecos.find((h) => h.inicio.getTime() === inicio.getTime());
      if (!hueco) throw new HuecoOcupado();
      // Sin preferencia: se queda con la misma persona si está libre.
      const staffId = persona || (hueco.staffIds.includes(c.staffId) ? c.staffId : hueco.staffIds[0]);

      await tx
        .update(cita)
        .set({
          inicio,
          fin: new Date(inicio.getTime() + s.duracionMin * MIN),
          margenMin: s.margenMin,
          staffId,
          recordatorioEnviadoAt: null,
        })
        .where(eq(cita.id, id));
      return `${fechaLegible(c.inicio)} → ${fechaLegible(inicio)}`;
    }, TRANSACCION);
  } catch (e) {
    if (e instanceof HuecoOcupado) redirect(`${volver}&aviso=ocupado`);
    throw e;
  }
  await anotar(yo.userId, "cita.cambio", `Cita cambiada de hora: ${texto}`);
  redirect(`${volver}&aviso=movida`);
}

// ── Estado y notas ───────────────────────────────────────────────────────────

const TEXTO_ESTADO = { completada: "completada", no_vino: "no vino", cancelada: "cancelada", confirmada: "confirmada" } as const;

export async function cambiarEstadoCita(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("agenda.gestionar");
  const id = String(formData.get("id") ?? "");
  const estado = z.enum(["completada", "no_vino", "cancelada", "confirmada"]).safeParse(formData.get("estado"));
  const [c] = await db.select({ estado: cita.estado, inicio: cita.inicio }).from(cita).where(eq(cita.id, id)).limit(1);
  if (!c || !estado.success) redirect("/crm/agenda");
  // Una cita cancelada libera su hueco: no se recupera (se crea otra si hace falta).
  if (c.estado === "cancelada" || c.estado === estado.data) redirect(`/crm/agenda/cita?id=${id}`);

  await db.update(cita).set({ estado: estado.data }).where(eq(cita.id, id));
  await anotar(yo.userId, `cita.${estado.data}`, `Cita del ${fechaLegible(c.inicio)}: ${TEXTO_ESTADO[estado.data]}`);
  redirect(`/crm/agenda/cita?id=${id}&aviso=${estado.data}`);
}

export async function guardarNotasCita(formData: FormData): Promise<void> {
  await exigirEquipo("agenda.gestionar");
  const id = String(formData.get("id") ?? "");
  const notas = String(formData.get("notas") ?? "").trim().slice(0, 1000);
  await db.update(cita).set({ notas: notas || null }).where(eq(cita.id, id));
  redirect(`/crm/agenda/cita?id=${id}&aviso=notas`);
}
