// Columnas comunes a todas las tablas (ARQUITECTURA §4):
// id ULID char(26), created_at y updated_at en UTC.
import { char, timestamp } from "drizzle-orm/mysql-core";
import { ulid } from "ulid";

export const nuevoId = () => ulid();

export const id = () =>
  char("id", { length: 26 }).primaryKey().$defaultFn(nuevoId);

/** Clave ajena a otra tabla (también ULID). */
export const ref = (nombre: string) => char(nombre, { length: 26 });

export const marcasDeTiempo = {
  createdAt: timestamp("created_at", { fsp: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at", { fsp: 3, mode: "date" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};
