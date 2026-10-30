// Academia (ARQUITECTURA §4): cursos online con lecciones en Vimeo y cursos presenciales con
// convocatorias (fechas) y plazas. Importes en céntimos con IVA incluido.
import { boolean, datetime, index, int, mysqlEnum, mysqlTable, smallint, text, tinyint, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { id, marcasDeTiempo, ref } from "../columnas";
import { cliente } from "./personas";

const instante = (nombre: string) => datetime(nombre, { fsp: 3, mode: "date" });

export const curso = mysqlTable(
  "curso",
  {
    id: id(),
    tipo: mysqlEnum("tipo", ["online", "presencial"]).notNull(),
    titulo: varchar("titulo", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull().unique(),
    resumen: varchar("resumen", { length: 300 }),
    descripcion: text("descripcion"),
    precio: int("precio").notNull(),
    tipoIva: tinyint("tipo_iva").notNull().default(21),
    nivel: varchar("nivel", { length: 60 }),
    duracion: varchar("duracion", { length: 60 }), // «2 días», «15 lecciones»
    visible: boolean("visible").notNull().default(true),
    orden: int("orden").notNull().default(0),
    ...marcasDeTiempo,
  },
  (t) => [index("curso_tipo_idx").on(t.tipo, t.orden)],
);

export const leccion = mysqlTable(
  "leccion",
  {
    id: id(),
    cursoId: ref("curso_id")
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    modulo: varchar("modulo", { length: 120 }),
    titulo: varchar("titulo", { length: 160 }).notNull(),
    orden: int("orden").notNull().default(0),
    // Nunca se muestra en páginas públicas: solo a alumnas con acceso (parte 2).
    vimeoId: varchar("vimeo_id", { length: 20 }),
    vimeoHash: varchar("vimeo_hash", { length: 40 }),
    duracionMin: smallint("duracion_min"),
    descripcion: text("descripcion"),
    ...marcasDeTiempo,
  },
  (t) => [index("leccion_curso_idx").on(t.cursoId, t.orden)],
);

export const accesoCurso = mysqlTable(
  "acceso_curso",
  {
    id: id(),
    clienteId: ref("cliente_id")
      .notNull()
      .references(() => cliente.id, { onDelete: "cascade" }),
    cursoId: ref("curso_id")
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    origen: mysqlEnum("origen", ["compra", "migracion", "manual"]).notNull(),
    pedidoId: ref("pedido_id"),
    desde: instante("desde").notNull(),
    hasta: instante("hasta"),
    ...marcasDeTiempo,
  },
  (t) => [uniqueIndex("acceso_curso_uq").on(t.clienteId, t.cursoId)],
);

export const progreso = mysqlTable(
  "progreso",
  {
    id: id(),
    clienteId: ref("cliente_id")
      .notNull()
      .references(() => cliente.id, { onDelete: "cascade" }),
    leccionId: ref("leccion_id")
      .notNull()
      .references(() => leccion.id, { onDelete: "cascade" }),
    completadaAt: instante("completada_at").notNull(),
    ...marcasDeTiempo,
  },
  (t) => [uniqueIndex("progreso_uq").on(t.clienteId, t.leccionId)],
);

export const convocatoria = mysqlTable(
  "convocatoria",
  {
    id: id(),
    cursoId: ref("curso_id")
      .notNull()
      .references(() => curso.id, { onDelete: "cascade" }),
    inicio: instante("inicio").notNull(),
    fin: instante("fin").notNull(),
    horario: varchar("horario", { length: 160 }),
    lugar: varchar("lugar", { length: 160 }),
    plazas: int("plazas").notNull(),
    // Nulo = solo se puede pagar el curso entero.
    precioSenal: int("precio_senal"),
    estado: mysqlEnum("estado", ["abierta", "cerrada", "cancelada"]).notNull().default("abierta"),
    ...marcasDeTiempo,
  },
  (t) => [index("convocatoria_curso_idx").on(t.cursoId, t.inicio)],
);

export const ESTADOS_PLAZA = ["reservada_pendiente", "senal_pagada", "pagada", "cancelada"] as const;

export const plaza = mysqlTable(
  "plaza",
  {
    id: id(),
    convocatoriaId: ref("convocatoria_id")
      .notNull()
      .references(() => convocatoria.id, { onDelete: "cascade" }),
    clienteId: ref("cliente_id")
      .notNull()
      .references(() => cliente.id),
    estado: mysqlEnum("estado", ESTADOS_PLAZA).notNull().default("reservada_pendiente"),
    modalidad: mysqlEnum("modalidad", ["senal", "total"]).notNull(),
    pedidoId: ref("pedido_id"),
    importePagado: int("importe_pagado").notNull().default(0),
    // Una reserva sin pagar deja de ocupar plaza a esta hora.
    caducaAt: instante("caduca_at"),
    notas: varchar("notas", { length: 255 }),
    ...marcasDeTiempo,
  },
  (t) => [index("plaza_convocatoria_idx").on(t.convocatoriaId), index("plaza_cliente_idx").on(t.clienteId)],
);
