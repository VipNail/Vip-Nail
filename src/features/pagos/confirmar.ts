import "server-only";
// Marca un pedido como pagado. Lo llama SOLO el aviso firmado de una pasarela. Idempotente:
// si llega dos veces, la segunda no hace nada. El stock se descuenta aquí, al pagar.
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { actividad, pedido, pedidoLinea, producto } from "@/db/schema";
import { euros } from "@/features/tienda/precios";

export type Resultado = "pagado" | "ya-pagado" | "no-existe" | "importe" | "estado";

export async function confirmarPago(d: { pedidoId: string; importe: number; metodo: string; ref: string }): Promise<Resultado> {
  const r = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedido).where(eq(pedido.id, d.pedidoId)).for("update");
    if (!p) return { r: "no-existe" as const };
    if (p.pagadoAt) return { r: "ya-pagado" as const };
    if (p.estado !== "pendiente_pago") return { r: "estado" as const, p };
    if (p.total !== d.importe) return { r: "importe" as const, p };

    const lineas = await tx.select().from(pedidoLinea).where(eq(pedidoLinea.pedidoId, p.id));
    for (const l of lineas) {
      if (l.productoId) {
        await tx
          .update(producto)
          .set({ stock: sql`${producto.stock} - ${l.cantidad}` })
          .where(eq(producto.id, l.productoId));
      }
    }
    const ids = lineas.map((l) => l.productoId).filter((x): x is string => Boolean(x));
    const sinStock = ids.length
      ? await tx
          .select({ referencia: producto.referencia })
          .from(producto)
          .where(and(inArray(producto.id, ids), lt(producto.stock, 0)))
      : [];
    const incidencia = sinStock.length
      ? `Pagado sin stock suficiente: ${sinStock.map((x) => x.referencia).join(", ")}`.slice(0, 255)
      : null;

    await tx
      .update(pedido)
      .set({
        estado: "pagado",
        pagadoAt: new Date(),
        metodoPago: d.metodo,
        refPasarela: d.ref.slice(0, 100),
        incidencia,
        factusolEstado: "pendiente",
      })
      .where(eq(pedido.id, p.id));
    return { r: "pagado" as const, p, incidencia };
  });

  if (r.r === "pagado") {
    await db.insert(actividad).values({
      userId: null,
      tipo: "pedido.pagado",
      descripcion: `Pedido ${r.p.numero} pagado: ${euros(r.p.total)} · ${r.p.nombre}${r.incidencia ? " · ⚠ sin stock" : ""}`.slice(0, 255),
    });
  } else if (r.r === "importe") {
    // El aviso no cuadra con el pedido: no se marca y queda registrado para revisar.
    await db.insert(actividad).values({
      userId: null,
      tipo: "pedido.aviso-erroneo",
      descripcion: `Aviso de pago con importe distinto en ${r.p.numero}: ${euros(d.importe)} ≠ ${euros(r.p.total)}`.slice(0, 255),
    });
  }
  // DEBT: email de confirmación a la clienta y aviso al estudio (cuando esté el SMTP).
  // DEBT: enviar el pedido a Factusol (factusol_estado = pendiente) cuando se resuelva P1.
  return r.r;
}
