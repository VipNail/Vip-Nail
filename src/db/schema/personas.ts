// Personas: equipo (staff) y ficha única de clienta (ARQUITECTURA §4).
import {
  boolean,
  char,
  datetime,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, marcasDeTiempo, ref } from "../columnas";
import { user } from "./auth";

export const ROLES = ["admin", "recepcion", "profesional", "formadora"] as const;
export type Rol = (typeof ROLES)[number];

export const staff = mysqlTable(
  "staff",
  {
    id: id(),
    userId: ref("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    colorAgenda: varchar("color_agenda", { length: 7 }).notNull().default("#9CA3AF"),
    activo: boolean("activo").notNull().default(true),
    rol: mysqlEnum("rol", ROLES).notNull(),
    ...marcasDeTiempo,
  },
  (t) => [index("staff_rol_idx").on(t.rol)],
);

export const cliente = mysqlTable(
  "cliente",
  {
    id: id(),
    // Nulo: clientas creadas desde el estudio sin cuenta web.
    userId: ref("user_id")
      .unique()
      .references(() => user.id, { onDelete: "set null" }),
    nombre: varchar("nombre", { length: 160 }).notNull(),
    email: varchar("email", { length: 191 }),
    telefono: varchar("telefono", { length: 32 }),
    etiquetas: json("etiquetas").$type<string[]>(),
    notas: text("notas"),
    factusolCodigo: varchar("factusol_codigo", { length: 32 }),
    origen: mysqlEnum("origen", ["web", "estudio", "migracion"]).notNull().default("web"),
    consentimientoMarketing: boolean("consentimiento_marketing").notNull().default(false),
    consentimientoMarketingAt: datetime("consentimiento_marketing_at", { fsp: 3 }),
    // Derecho de supresión (RGPD): la ficha se anonimiza en vez de borrarse para no romper
    // el historial de citas y ventas. Con fecha = ficha borrada.
    borradaAt: datetime("borrada_at", { fsp: 3, mode: "date" }),
    ...marcasDeTiempo,
  },
  (t) => [
    index("cliente_email_idx").on(t.email),
    index("cliente_telefono_idx").on(t.telefono),
    index("cliente_factusol_idx").on(t.factusolCodigo),
  ],
);

/**
 * Enlaces de un solo uso para que una clienta cree (o recupere) su contraseña de la zona de
 * alumna. Los genera el equipo desde la ficha (se mandan por WhatsApp mientras no haya correo).
 * Solo se guarda el resumen (SHA-256) del enlace, nunca el enlace.
 */
export const enlaceCuenta = mysqlTable(
  "enlace_cuenta",
  {
    id: id(),
    clienteId: ref("cliente_id")
      .notNull()
      .references(() => cliente.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    caducaAt: datetime("caduca_at", { fsp: 3, mode: "date" }).notNull(),
    usadoAt: datetime("usado_at", { fsp: 3, mode: "date" }),
    creadoPor: ref("creado_por"),
    ...marcasDeTiempo,
  },
  (t) => [index("enlace_cuenta_cliente_idx").on(t.clienteId)],
);
