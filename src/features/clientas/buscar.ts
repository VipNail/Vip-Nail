import "server-only";
import { eq, or } from "drizzle-orm";
import { cliente } from "@/db/schema";
import type { Ejecutor } from "@/features/reservas/consultas";

/**
 * Teléfono en un formato único para no duplicar fichas: los móviles españoles quedan en
 * 9 cifras («600123123»); los extranjeros, con «+» y prefijo.
 */
export function normalizarTelefono(valor: string): string | null {
  const limpio = valor.trim().replace(/[^\d+]/g, "");
  if (!limpio) return null;
  let cifras = limpio.replace(/^\+/, "").replace(/^00/, "");
  const internacional = limpio.startsWith("+") || limpio.startsWith("00");
  if (internacional && cifras.startsWith("34") && cifras.length === 11) cifras = cifras.slice(2);
  else if (internacional) return `+${cifras}`;
  return cifras.length >= 6 ? cifras : null;
}

/**
 * Devuelve la ficha de la clienta con ese teléfono o email; si no existe, la crea.
 * Así una clienta que llama varias veces tiene una sola ficha.
 */
export async function buscarOCrearCliente(
  ex: Ejecutor,
  datos: { nombre: string; telefono: string; email: string },
): Promise<{ id: string; nombre: string; nueva: boolean }> {
  const telefono = normalizarTelefono(datos.telefono);
  const email = datos.email.trim().toLowerCase() || null;
  const condiciones = [telefono ? eq(cliente.telefono, telefono) : undefined, email ? eq(cliente.email, email) : undefined].filter(
    (c) => c !== undefined,
  );

  if (condiciones.length) {
    const [existente] = await ex
      .select({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, email: cliente.email })
      .from(cliente)
      .where(or(...condiciones))
      .limit(1);
    if (existente) {
      // Completa lo que faltase en la ficha, sin pisar lo que ya tenía.
      const completar: Partial<typeof cliente.$inferInsert> = {};
      if (!existente.telefono && telefono) completar.telefono = telefono;
      if (!existente.email && email) completar.email = email;
      if (Object.keys(completar).length) await ex.update(cliente).set(completar).where(eq(cliente.id, existente.id));
      return { id: existente.id, nombre: existente.nombre, nueva: false };
    }
  }

  const [nueva] = await ex
    .insert(cliente)
    .values({ nombre: datos.nombre.trim(), telefono, email, origen: "estudio" })
    .$returningId();
  return { id: nueva.id, nombre: datos.nombre.trim(), nueva: true };
}
