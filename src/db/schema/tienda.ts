// Tienda: catálogo y ofertas (ARQUITECTURA §4). Importes en céntimos con IVA incluido.
// El catálogo vendrá de Factusol (P1); mientras tanto se gestiona desde el CRM.
import {
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, marcasDeTiempo, ref } from "../columnas";

const instante = (nombre: string) => datetime(nombre, { fsp: 3, mode: "date" });

/** Dos niveles: grupo (p. ej. «Molekula») → subcategoría (p. ej. «Esmaltes»). */
export const categoria = mysqlTable(
  "categoria",
  {
    id: id(),
    parentId: ref("parent_id"),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    descripcion: text("descripcion"),
    orden: int("orden").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    ...marcasDeTiempo,
  },
  (t) => [index("categoria_parent_idx").on(t.parentId, t.orden)],
);

export const marca = mysqlTable("marca", {
  id: id(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  ...marcasDeTiempo,
});

export const TIPOS_IVA = [21, 10, 4, 0] as const;

export const producto = mysqlTable(
  "producto",
  {
    id: id(),
    // Referencia de la tienda actual / código de artículo de Factusol (tipo «1D5071»).
    referencia: varchar("referencia", { length: 40 }).notNull().unique(),
    ean: varchar("ean", { length: 20 }),
    factusolCodigo: varchar("factusol_codigo", { length: 32 }),
    nombre: varchar("nombre", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    descripcion: text("descripcion"),
    categoriaId: ref("categoria_id").references(() => categoria.id, { onDelete: "set null" }),
    marcaId: ref("marca_id").references(() => marca.id, { onDelete: "set null" }),
    precio: int("precio").notNull(), // céntimos, IVA incluido
    tipoIva: tinyint("tipo_iva").notNull().default(21),
    stock: int("stock").notNull().default(0),
    activo: boolean("activo").notNull().default(true),
    destacado: boolean("destacado").notNull().default(false),
    pesoG: int("peso_g"),
    ...marcasDeTiempo,
  },
  (t) => [
    index("producto_categoria_idx").on(t.categoriaId),
    index("producto_marca_idx").on(t.marcaId),
    index("producto_nombre_idx").on(t.nombre),
  ],
);

/** Oferta con fechas sobre un producto o una categoría (incluye sus subcategorías). */
export const oferta = mysqlTable(
  "oferta",
  {
    id: id(),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    productoId: ref("producto_id").references(() => producto.id, { onDelete: "cascade" }),
    categoriaId: ref("categoria_id").references(() => categoria.id, { onDelete: "cascade" }),
    tipo: mysqlEnum("tipo", ["porcentaje", "importe"]).notNull(),
    // porcentaje: 1–90 (%); importe: céntimos que se descuentan.
    valor: int("valor").notNull(),
    inicio: instante("inicio").notNull(),
    fin: instante("fin").notNull(),
    ...marcasDeTiempo,
  },
  (t) => [index("oferta_fechas_idx").on(t.inicio, t.fin)],
);
