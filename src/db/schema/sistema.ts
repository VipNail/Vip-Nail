// Sistema: registro de actividad para «Últimos movimientos» del CRM.
import { index, json, mysqlTable, varchar } from "drizzle-orm/mysql-core";
import { id, marcasDeTiempo, ref } from "../columnas";
import { user } from "./auth";

export const actividad = mysqlTable(
  "actividad",
  {
    id: id(),
    // Quién lo hizo (nulo = sistema / cron).
    userId: ref("user_id").references(() => user.id, { onDelete: "set null" }),
    tipo: varchar("tipo", { length: 64 }).notNull(), // p. ej. "staff.alta", "auth.login"
    descripcion: varchar("descripcion", { length: 255 }).notNull(),
    datos: json("datos").$type<Record<string, unknown>>(),
    ...marcasDeTiempo,
  },
  (t) => [index("actividad_created_idx").on(t.createdAt)],
);
