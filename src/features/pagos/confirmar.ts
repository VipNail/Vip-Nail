import "server-only";
// Marca un pedido como pagado. Lo llama SOLO el aviso firmado de una pasarela. Idempotente:
// si llega dos veces, la segunda no hace nada. El stock se descuenta aquí, al pagar.
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { accesoCurso, actividad, convocatoria, pedido, pedidoLinea, plaza, producto } from "@/db/schema";
import { ocupa } from "@/features/academia/logica";
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
    const avisos: string[] = [];
    if (sinStock.length) avisos.push(`Pagado sin stock suficiente: ${sinStock.map((x) => x.referencia).join(", ")}`);

    // Cursos online: acceso inmediato.
    for (const l of lineas.filter((x) => x.tipo === "curso" && x.cursoId)) {
      const [ya] = await tx
        .select({ id: accesoCurso.id })
        .from(accesoCurso)
        .where(and(eq(accesoCurso.clienteId, p.clienteId), eq(accesoCurso.cursoId, l.cursoId!)))
        .limit(1);
      if (!ya) await tx.insert(accesoCurso).values({ clienteId: p.clienteId, cursoId: l.cursoId!, origen: "compra", pedidoId: p.id, desde: new Date() });
    }
    // Cursos presenciales: la plaza queda confirmada (señal o completa).
    const plazas = await tx.select().from(plaza).where(eq(plaza.pedidoId, p.id));
    for (const pl of plazas) {
      if (pl.estado !== "reservada_pendiente") continue;
      // Si la reserva caducó y entretanto se llenó la convocatoria, se avisa para resolverlo a mano.
      const [conv] = await tx.select({ plazas: convocatoria.plazas }).from(convocatoria).where(eq(convocatoria.id, pl.convocatoriaId)).for("update");
      const otras = await tx.select({ id: plaza.id, estado: plaza.estado, caducaAt: plaza.caducaAt }).from(plaza).where(eq(plaza.convocatoriaId, pl.convocatoriaId));
      const ocupadas = otras.filter((o) => o.id !== pl.id && ocupa(o, new Date())).length;
      if (conv && ocupadas >= conv.plazas) avisos.push("Plaza pagada cuando la convocatoria ya estaba llena");
      await tx
        .update(plaza)
        .set({ estado: pl.modalidad === "total" ? "pagada" : "senal_pagada", importePagado: p.total, caducaAt: null })
        .where(eq(plaza.id, pl.id));
    }
    const incidencia = avisos.length ? avisos.join(" · ").slice(0, 255) : null;

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
