import "server-only";
// Cuentas de la zona de alumna. No hay alta libre: la clienta crea su contraseña con un enlace
// de un solo uso (lo genera el equipo, o sale en su pedido pagado de un curso). Así nadie puede
// quedarse con los cursos de otra persona escribiendo su email.
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, gt } from "drizzle-orm";
import { db } from "@/db";
import { account, cliente, enlaceCuenta, session, staff, user } from "@/db/schema";
import { auth } from "@/lib/auth";

export const DIAS_ENLACE = 7;
export const resumen = (token: string) => createHash("sha256").update(token).digest("hex");

/** Crea un enlace nuevo (anula los anteriores sin usar) y devuelve la clave en claro. */
export async function crearEnlace(clienteId: string, creadoPor: string | null): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx.update(enlaceCuenta).set({ usadoAt: new Date() }).where(and(eq(enlaceCuenta.clienteId, clienteId), isNull(enlaceCuenta.usadoAt)));
    await tx.insert(enlaceCuenta).values({
      clienteId,
      tokenHash: resumen(token),
      caducaAt: new Date(Date.now() + DIAS_ENLACE * 86_400_000),
      creadoPor,
    });
  });
  return token;
}

/** El enlace vale si existe, no se ha usado, no ha caducado y la ficha no está borrada. */
export async function leerEnlace(token: string) {
  if (!/^[\w-]{20,100}$/.test(token)) return null;
  const [f] = await db
    .select({ enlace: enlaceCuenta, cliente })
    .from(enlaceCuenta)
    .innerJoin(cliente, eq(cliente.id, enlaceCuenta.clienteId))
    .where(and(eq(enlaceCuenta.tokenHash, resumen(token)), isNull(enlaceCuenta.usadoAt), gt(enlaceCuenta.caducaAt, new Date()), isNull(cliente.borradaAt)))
    .limit(1);
  return f ?? null;
}

export class ErrorCuenta extends Error {}

/**
 * Pone la contraseña de la cuenta de una clienta: la crea si no tiene, o la cambia (y cierra
 * sus sesiones) si ya tenía. Devuelve el email con el que entra.
 */
export async function ponerContrasena(clienteId: string, password: string): Promise<string> {
  const ctx = await auth.$context;
  const [c] = await db.select().from(cliente).where(eq(cliente.id, clienteId)).limit(1);
  if (!c || c.borradaAt) throw new ErrorCuenta("Esta ficha ya no existe.");
  const hash = await ctx.password.hash(password);

  let userId = c.userId;
  if (!userId) {
    if (!c.email) throw new ErrorCuenta("Tu ficha no tiene email. Escríbenos y lo añadimos.");
    const email = c.email.toLowerCase();
    const [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (u) {
      // Una cuenta del equipo, o de otra clienta, no se toca desde aquí.
      const [esEquipo] = await db.select({ id: staff.id }).from(staff).where(eq(staff.userId, u.id)).limit(1);
      const [otra] = await db.select({ id: cliente.id }).from(cliente).where(eq(cliente.userId, u.id)).limit(1);
      if (esEquipo || otra) throw new ErrorCuenta("Ese email ya tiene otra cuenta. Escríbenos y lo revisamos.");
      userId = u.id;
    } else {
      const nuevo = await ctx.internalAdapter.createUser({ name: c.nombre, email, emailVerified: true }, { method: "enlace" });
      userId = nuevo.id;
    }
    await db.update(cliente).set({ userId }).where(eq(cliente.id, c.id));
  }

  const [cred] = await db.select({ id: account.id }).from(account).where(and(eq(account.userId, userId), eq(account.providerId, "credential"))).limit(1);
  if (cred) {
    await db.update(account).set({ password: hash }).where(eq(account.id, cred.id));
    await db.delete(session).where(eq(session.userId, userId));
  } else {
    await ctx.internalAdapter.linkAccount({ userId, providerId: "credential", accountId: userId, password: hash });
  }
  const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  return u.email;
}
