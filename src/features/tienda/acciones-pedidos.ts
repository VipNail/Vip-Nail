"use server";
// Pedidos desde el CRM (administración y recepción). Los cambios de estado siguen un camino fijo.
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { actividad, metodoEnvio, pedido, pedidoLinea, producto, type EstadoPedido } from "@/db/schema";
import { exigirEquipo } from "@/lib/sesion";
import { leerEuros } from "./precios";

/** A qué estados se puede pasar desde cada uno. */
const CAMINOS: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente_pago: ["cancelado"],
  pagado: ["preparando", "enviado", "reembolsado"],
  preparando: ["enviado", "reembolsado"],
  enviado: [],
  cancelado: [],
  reembolsado: [],
};

export async function cambiarEstadoPedido(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("pedidos.gestionar");
  const id = String(formData.get("id") ?? "");
  const nuevo = String(formData.get("estado") ?? "") as EstadoPedido;
  const seguimiento = String(formData.get("seguimiento") ?? "").trim().slice(0, 120);
  const volver = `/crm/pedidos/ver?id=${id}`;

  const r = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(pedido).where(eq(pedido.id, id)).for("update");
    if (!p) return null;
    if (!CAMINOS[p.estado].includes(nuevo)) return { p, ok: false };
    if (nuevo === "reembolsado") {
      // Se devuelve el stock de lo que no se llegó a enviar.
      const lineas = await tx.select().from(pedidoLinea).where(eq(pedidoLinea.pedidoId, p.id));
      for (const l of lineas)
        if (l.productoId) await tx.update(producto).set({ stock: sql`${producto.stock} + ${l.cantidad}` }).where(eq(producto.id, l.productoId));
    }
    await tx
      .update(pedido)
      .set({
        estado: nuevo,
        ...(nuevo === "enviado" ? { enviadoAt: new Date(), seguimiento: seguimiento || null } : {}),
      })
      .where(eq(pedido.id, p.id));
    return { p, ok: true };
  });
  if (!r) redirect("/crm/pedidos");
  if (!r.ok) redirect(`${volver}&aviso=no-permitido`);
  await db.insert(actividad).values({
    userId: yo.userId,
    tipo: `pedido.${nuevo}`,
    descripcion: `Pedido ${r.p.numero}: ${{ preparando: "preparando", enviado: r.p.envioTipo === "recogida" ? "listo para recoger" : "enviado", cancelado: "cancelado", reembolsado: "devuelto (stock repuesto)", pagado: "pagado", pendiente_pago: "pendiente" }[nuevo]}`,
  });
  redirect(`${volver}&aviso=${nuevo}`);
}

export async function guardarNotaPedido(formData: FormData): Promise<void> {
  await exigirEquipo("pedidos.gestionar");
  const id = String(formData.get("id") ?? "");
  const nota = String(formData.get("notaInterna") ?? "").trim().slice(0, 2000);
  const resolver = formData.get("resolverIncidencia") === "on";
  await db
    .update(pedido)
    .set({ notaInterna: nota || null, ...(resolver ? { incidencia: null } : {}) })
    .where(eq(pedido.id, id));
  redirect(`/crm/pedidos/ver?id=${id}&aviso=nota`);
}

// ── Formas de entrega ────────────────────────────────────────────────────────

const EsquemaEnvio = z.object({
  id: z.string().length(26),
  nombre: z.string().trim().min(3).max(120),
  descripcion: z.string().trim().max(255),
  precio: z.string(),
  gratisDesde: z.string(),
});

export async function guardarMetodoEnvio(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("productos.gestionar");
  const r = EsquemaEnvio.safeParse(Object.fromEntries(formData));
  if (!r.success) redirect("/crm/pedidos/envios?aviso=error");
  const precio = leerEuros(r.data.precio || "0");
  const gratis = r.data.gratisDesde.trim() ? leerEuros(r.data.gratisDesde) : null;
  if (precio === null || (r.data.gratisDesde.trim() && gratis === null)) redirect("/crm/pedidos/envios?aviso=error");
  await db
    .update(metodoEnvio)
    .set({ nombre: r.data.nombre, descripcion: r.data.descripcion || null, precio, gratisDesde: gratis, activo: formData.get("activo") === "on" })
    .where(eq(metodoEnvio.id, r.data.id));
  await db.insert(actividad).values({ userId: yo.userId, tipo: "envio.edicion", descripcion: `Forma de entrega actualizada: ${r.data.nombre}` });
  redirect("/crm/pedidos/envios?aviso=guardado");
}
