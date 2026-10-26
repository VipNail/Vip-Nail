// Tablas de Better Auth (user / session / account / verification).
// Los nombres de propiedad deben coincidir con los que espera Better Auth.
import {
  boolean,
  index,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { id, marcasDeTiempo, ref } from "../columnas";

const fecha = (nombre: string) => timestamp(nombre, { fsp: 3, mode: "date" });

export const user = mysqlTable("user", {
  id: id(),
  name: varchar("name", { length: 191 }).notNull(),
  email: varchar("email", { length: 191 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...marcasDeTiempo,
});

export const session = mysqlTable(
  "session",
  {
    id: id(),
    expiresAt: fecha("expires_at").notNull(),
    token: varchar("token", { length: 191 }).notNull().unique(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    userId: ref("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...marcasDeTiempo,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: id(),
    accountId: varchar("account_id", { length: 191 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    userId: ref("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: fecha("access_token_expires_at"),
    refreshTokenExpiresAt: fecha("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...marcasDeTiempo,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: id(),
    identifier: varchar("identifier", { length: 191 }).notNull(),
    value: text("value").notNull(),
    expiresAt: fecha("expires_at").notNull(),
    ...marcasDeTiempo,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
