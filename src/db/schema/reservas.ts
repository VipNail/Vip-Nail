// Estudio y reservas (ARQUITECTURA §4). Fechas y horas guardadas en UTC; los horarios
// semanales van en minutos desde medianoche, hora de Madrid.
import {
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  smallint,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, marcasDeTiempo, ref } from "../columnas";
import { user } from "./auth";
import { cliente, staff } from "./personas";

const instante = (nombre: string) => datetime(nombre, { fsp: 3, mode: "date" });

export const servicio = mysqlTable(
  "servicio",
  {
    id: id(),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    descripcion: text("descripcion"),
    categoria: varchar("categoria", { length: 80 }),
    duracionMin: smallint("duracion_min").notNull(),
    // Limpieza / preparación tras la cita: separa una cita de la siguiente.
    margenMin: smallint("margen_min").notNull().default(0),
    // Se puede reservar desde la web.
    visible: boolean("visible").notNull().default(true),
    // false = archivado (no se borra para no romper citas antiguas).
    activo: boolean("activo").notNull().default(true),
    orden: int("orden").notNull().default(0),
    ...marcasDeTiempo,
  },
  (t) => [index("servicio_orden_idx").on(t.orden)],
);

/** Qué profesional hace qué servicio. */
export const staffServicio = mysqlTable(
  "staff_servicio",
  {
    id: id(),
    staffId: ref("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    servicioId: ref("servicio_id")
      .notNull()
      .references(() => servicio.id, { onDelete: "cascade" }),
    ...marcasDeTiempo,
  },
  (t) => [uniqueIndex("staff_servicio_uq").on(t.staffId, t.servicioId)],
);

/** Horario semanal por persona. Varias franjas por día (mañana y tarde). */
export const horario = mysqlTable(
  "horario",
  {
    id: id(),
    staffId: ref("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    diaSemana: tinyint("dia_semana").notNull(), // 1 = lunes … 7 = domingo
    inicioMin: smallint("inicio_min").notNull(), // minutos desde 00:00 (Madrid)
    finMin: smallint("fin_min").notNull(),
    ...marcasDeTiempo,
  },
  (t) => [index("horario_staff_idx").on(t.staffId, t.diaSemana)],
);

/** Vacaciones, pausas o festivos. staff_id nulo = todo el estudio. */
export const bloqueo = mysqlTable(
  "bloqueo",
  {
    id: id(),
    staffId: ref("staff_id").references(() => staff.id, { onDelete: "cascade" }),
    inicio: instante("inicio").notNull(),
    fin: instante("fin").notNull(),
    motivo: varchar("motivo", { length: 160 }).notNull(),
    creadoPor: ref("creado_por").references(() => user.id, { onDelete: "set null" }),
    ...marcasDeTiempo,
  },
  (t) => [index("bloqueo_rango_idx").on(t.inicio, t.fin)],
);

export const ESTADOS_CITA = ["confirmada", "cancelada", "no_vino", "completada"] as const;

export const cita = mysqlTable(
  "cita",
  {
    id: id(),
    clienteId: ref("cliente_id")
      .notNull()
      .references(() => cliente.id),
    staffId: ref("staff_id")
      .notNull()
      .references(() => staff.id),
    servicioId: ref("servicio_id")
      .notNull()
      .references(() => servicio.id),
    inicio: instante("inicio").notNull(),
    fin: instante("fin").notNull(), // fin del servicio (sin margen)
    // Margen congelado al reservar: si luego cambia el servicio, la cita no se mueve.
    margenMin: smallint("margen_min").notNull().default(0),
    estado: mysqlEnum("estado", ESTADOS_CITA).notNull().default("confirmada"),
    origen: mysqlEnum("origen", ["web", "telefono", "presencial"]).notNull(),
    tokenGestion: varchar("token_gestion", { length: 64 }).notNull().unique(),
    recordatorioEnviadoAt: instante("recordatorio_enviado_at"),
    notas: text("notas"),
    ...marcasDeTiempo,
  },
  (t) => [
    index("cita_staff_inicio_idx").on(t.staffId, t.inicio),
    index("cita_cliente_idx").on(t.clienteId),
  ],
);

/** Ajustes generales de reserva (una sola fila; si no existe se usan los valores por defecto). */
export const ajustesReserva = mysqlTable("ajustes_reserva", {
  id: id(),
  antelacionMinMin: int("antelacion_min_min").notNull().default(120),
  ventanaMaxDias: int("ventana_max_dias").notNull().default(60),
  limiteCancelacionHoras: int("limite_cancelacion_horas").notNull().default(24),
  pasoMin: int("paso_min").notNull().default(15),
  ...marcasDeTiempo,
});
