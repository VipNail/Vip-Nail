import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { nuevoId } from "@/db/columnas";

export const auth = betterAuth({
  appName: "VIP Nail Studio",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // DEBT: el alta pública se abrirá cuando exista el área de clienta/alumna.
    // De momento las cuentas se crean desde /instalar (primer admin) y luego desde el CRM.
    disableSignUp: true,
    // DEBT: recuperación de contraseña por email cuando esté el SMTP (semana 1).
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 días
    updateAge: 60 * 60 * 24, // renueva una vez al día
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  advanced: {
    database: { generateId: () => nuevoId() },
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  telemetry: { enabled: false },
  plugins: [nextCookies()], // debe ir el último
});

export type Sesion = typeof auth.$Infer.Session;
