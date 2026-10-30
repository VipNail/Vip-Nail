import "server-only";
// Numeración correlativa de pedidos por año (VN-AAAA-NNNNN), segura con varias compras a la vez.
import { eq, sql } from "drizzle-orm";
import { contador } from "@/db/schema";
import type { Ejecutor } from "@/features/reservas/consultas";
import { numeroPedido } from "./calculo";

/** Llamar DENTRO de una transacción: bloquea el contador hasta que termine. */
export async function siguienteNumeroPedido(tx: Ejecutor): Promise<string> {
  const anio = new Date().getFullYear();
  const clave = `pedido-${anio}`;
  await tx.insert(contador).values({ clave, valor: 0 }).onDuplicateKeyUpdate({ set: { clave: sql`clave` } });
  const [{ valor }] = await tx.select({ valor: contador.valor }).from(contador).where(eq(contador.clave, clave)).for("update");
  await tx.update(contador).set({ valor: valor + 1 }).where(eq(contador.clave, clave));
  return numeroPedido(anio, valor + 1);
}
