import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

type Db = MySql2Database<typeof schema> & { $client: mysql.Pool };

function crearDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable de entorno DATABASE_URL");
  const pool = mysql.createPool({
    uri: url,
    connectionLimit: 5, // el hosting compartido limita conexiones simultáneas
    timezone: "Z", // todo en UTC; se muestra en Europe/Madrid
    charset: "utf8mb4",
  });
  return drizzle(pool, { schema, mode: "default" });
}

// Conexión perezosa y única por proceso: no se abre hasta la primera consulta
// (así el build no necesita la BD) y no se duplica con recargas en desarrollo.
const g = globalThis as unknown as { __vipDb?: Db };

export const db: Db = new Proxy({} as Db, {
  get(_, prop) {
    g.__vipDb ??= crearDb();
    const valor = Reflect.get(g.__vipDb, prop, g.__vipDb);
    return typeof valor === "function" ? valor.bind(g.__vipDb) : valor;
  },
});

export { schema };
