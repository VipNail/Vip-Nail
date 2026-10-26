import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { nuevoId } from "@/db/columnas";
import { googleActivo } from "./proveedores";

/**
 * Orígenes desde los que se acepta el login: la dirección oficial y su variante con o sin «www».
 * La proxy ya redirige www → dominio raíz; esto es la red de seguridad si la redirección no llega.
 */
function origenesDeConfianza(): string[] {
  const base = process.env.BETTER_AUTH_URL;
  if (!base) return [];
  try {
    const url = new URL(base);
    const sinWww = url.host.replace(/^www\./, ""); // host incluye el puerto si lo hay
    return [`${url.protocol}//${sinWww}`, `${url.protocol}//www.${sinWww}`];
  } catch {
    return [];
  }
}

export const auth = betterAuth({
  appName: "VIP Nail Studio",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: origenesDeConfianza(),
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
  socialProviders: googleActivo
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
          // DEBT: de momento Google solo sirve para entrar con una cuenta que ya existe (equipo).
          // El registro de clientas/alumnas con Google se abrirá con su área de cuenta.
          disableSignUp: true,
        },
      }
    : undefined,
  account: {
    // Si el email de Google coincide con una cuenta ya dada de alta (y verificada), se enlazan solas.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
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
  databaseHooks: {
    session: {
      create: {
        // Una persona del equipo desactivada no puede iniciar sesión.
        // (Las cuentas sin ficha de equipo —clientas, más adelante— no se ven afectadas.)
        before: async (s) => {
          const [baja] = await db
            .select({ id: schema.staff.id })
            .from(schema.staff)
            .where(and(eq(schema.staff.userId, s.userId), eq(schema.staff.activo, false)))
            .limit(1);
          if (baja) throw new APIError("FORBIDDEN", { code: "CUENTA_DESACTIVADA", message: "Cuenta desactivada" });
        },
      },
    },
  },
  plugins: [nextCookies()], // debe ir el último
});

export type Sesion = typeof auth.$Infer.Session;
