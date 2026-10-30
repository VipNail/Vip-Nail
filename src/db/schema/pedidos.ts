// Pedidos de la tienda (ARQUITECTURA §4). Importes en céntimos con IVA incluido.
// Nombre, precio e IVA de cada línea quedan congelados al hacer el pedido.
import { datetime, index, int, json, mysqlEnum, mysqlTable, boolean, text, tinyint, varchar } from "drizzle-orm/mysql-core";
import { id, marcasDeTiempo, ref } from "../columnas";
import { cliente } from "./personas";
import { producto } from "./tienda";

const instante = (nombre: string) => datetime(nombre, { fsp: 3, mode: "date" });

export const metodoEnvio = mysqlTable("metodo_envio", {
  id: id(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  tipo: mysqlEnum("tipo", ["envio", "recogida"]).notNull(),
  descripcion: varchar("descripcion", { length: 255 }),
  precio: int("precio").notNull().default(0),
  // Gratis a partir de este importe de productos (nulo = nunca gratis).
  gratisDesde: int("gratis_desde"),
  activo: boolean("activo").notNull().default(true),
  orden: int("orden").notNull().default(0),
  ...marcasDeTiempo,
});

export const ESTADOS_PEDIDO = ["pendiente_pago", "pagado", "preparando", "enviado", "cancelado", "reembolsado"] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export type DireccionEnvio = {
  nombre: string;
  direccion: string;
  cp: string;
  ciudad: string;
  provincia: string;
};

export const pedido = mysqlTable(
  "pedido",
  {
    id: id(),
    numero: varchar("numero", { length: 20 }).notNull().unique(), // «VN-2026-00001»
    clienteId: ref("cliente_id")
      .notNull()
      .references(() => cliente.id),
    estado: mysqlEnum("estado", ESTADOS_PEDIDO).notNull().default("pendiente_pago"),
    // Datos de contacto congelados (la ficha puede cambiar después).
    nombre: varchar("nombre", { length: 160 }).notNull(),
    email: varchar("email", { length: 191 }).notNull(),
    telefono: varchar("telefono", { length: 32 }).notNull(),
    metodoEnvioId: ref("metodo_envio_id").references(() => metodoEnvio.id, { onDelete: "set null" }),
    envioNombre: varchar("envio_nombre", { length: 120 }).notNull(),
    envioTipo: mysqlEnum("envio_tipo", ["envio", "recogida"]).notNull(),
    direccion: json("direccion").$type<DireccionEnvio | null>(),
    notas: text("notas"),
    subtotal: int("subtotal").notNull(), // productos, IVA incl.
    envio: int("envio").notNull(),
    total: int("total").notNull(),
    metodoPago: varchar("metodo_pago", { length: 20 }),
    refPasarela: varchar("ref_pasarela", { length: 100 }),
    pagadoAt: instante("pagado_at"),
    enviadoAt: instante("enviado_at"),
    seguimiento: varchar("seguimiento", { length: 120 }),
    // Problema a revisar a mano (p. ej. se pagó pero ya no quedaba stock).
    incidencia: varchar("incidencia", { length: 255 }),
    // Para que la clienta vea su pedido sin cuenta (enlace secreto).
    tokenAcceso: varchar("token_acceso", { length: 64 }).notNull().unique(),
    // Integración con Factusol (P1): el pedido pagado se envía allí para facturar.
    factusolEstado: mysqlEnum("factusol_estado", ["pendiente", "enviado", "error"]),
    factusolAt: instante("factusol_at"),
    factusolError: varchar("factusol_error", { length: 255 }),
    notaInterna: text("nota_interna"),
    ...marcasDeTiempo,
  },
  (t) => [
    index("pedido_cliente_idx").on(t.clienteId),
    index("pedido_estado_idx").on(t.estado, t.createdAt),
  ],
);

export const pedidoLinea = mysqlTable(
  "pedido_linea",
  {
    id: id(),
    pedidoId: ref("pedido_id")
      .notNull()
      .references(() => pedido.id, { onDelete: "cascade" }),
    productoId: ref("producto_id").references(() => producto.id, { onDelete: "set null" }),
    referencia: varchar("referencia", { length: 40 }).notNull(),
    nombre: varchar("nombre", { length: 200 }).notNull(),
    precio: int("precio").notNull(), // unitario cobrado (con la oferta ya aplicada)
    precioOriginal: int("precio_original").notNull(),
    oferta: varchar("oferta", { length: 120 }),
    tipoIva: tinyint("tipo_iva").notNull(),
    cantidad: int("cantidad").notNull(),
    ...marcasDeTiempo,
  },
  (t) => [index("pedido_linea_pedido_idx").on(t.pedidoId)],
);

/** Contadores con nombre (numeración de pedidos por año). */
export const contador = mysqlTable("contador", {
  clave: varchar("clave", { length: 40 }).primaryKey(),
  valor: int("valor").notNull().default(0),
});
