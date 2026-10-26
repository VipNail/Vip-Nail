import "server-only";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { actividad, staff, user, type Rol } from "@/db/schema";
import { auth } from "@/lib/auth";
import { NOMBRE_ROL } from "@/lib/permisos";

export async function hayAdmin(): Promise<boolean> {
  const [fila] = await db.select({ n: count() }).from(staff).where(eq(staff.rol, "admin"));
  return (fila?.n ?? 0) > 0;
}

/**
 * Crea una cuenta de equipo (usuario + contraseña + ficha staff).
 * Se usa el adaptador interno porque el alta pública está cerrada (disableSignUp).
 */
export async function crearMiembroEquipo(datos: {
  nombre: string;
  email: string;
  password: string;
  rol: Rol;
  colorAgenda?: string;
  creadoPor?: string;
}) {
  const ctx = await auth.$context;
  const email = datos.email.toLowerCase();

  const existente = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existente.length) throw new Error("Ya existe una cuenta con ese email.");

  const hash = await ctx.password.hash(datos.password);
  const nuevo = await ctx.internalAdapter.createUser(
    { name: datos.nombre, email, emailVerified: true },
    { method: "admin" },
  );
  try {
    await ctx.internalAdapter.linkAccount({
      userId: nuevo.id,
      providerId: "credential",
      accountId: nuevo.id,
      password: hash,
    });
    await db.insert(staff).values({
      userId: nuevo.id,
      nombre: datos.nombre,
      rol: datos.rol,
      ...(datos.colorAgenda ? { colorAgenda: datos.colorAgenda } : {}),
    });
  } catch (e) {
    // Sin ficha de equipo la cuenta no sirve: se deshace para poder repetir el alta.
    await db.delete(user).where(eq(user.id, nuevo.id));
    throw e;
  }
  await db.insert(actividad).values({
    userId: datos.creadoPor ?? nuevo.id,
    tipo: "staff.alta",
    descripcion: `Alta en el equipo: ${datos.nombre} (${NOMBRE_ROL[datos.rol]})`,
  });
  return nuevo.id;
}
