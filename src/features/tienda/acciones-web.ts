"use server";
// Acciones de la tienda pública (sin sesión): cesta, pedido y pago.
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { metodoEnvio, pedido, pedidoLinea, producto } from "@/db/schema";
import { buscarOCrearCliente, normalizarTelefono } from "@/features/clientas/buscar";
import { proveedor } from "@/features/pagos/proveedores";
import { MAX_UNIDADES, totales } from "./calculo";
import { calcularCesta, guardarCesta, leerCesta } from "./cesta";
import { siguienteNumeroPedido } from "./numeracion";

export type EstadoFormulario = { error?: string };
const ULID = z.string().length(26);

// ── Cesta ────────────────────────────────────────────────────────────────────

export async function anadirACesta(formData: FormData): Promise<void> {
  const id = ULID.safeParse(formData.get("productoId"));
  const cantidad = Math.min(MAX_UNIDADES, Math.max(1, Math.floor(Number(formData.get("cantidad")) || 1)));
  if (!id.success) redirect("/tienda");
  const [p] = await db
    .select({ id: producto.id, stock: producto.stock })
    .from(producto)
    .where(and(eq(producto.id, id.data), eq(producto.activo, true)))
    .limit(1);
  if (!p) redirect("/tienda");
  const tope = Math.min(MAX_UNIDADES, Math.max(0, p.stock));
  if (tope === 0) redirect("/tienda/cesta?aviso=agotado");
  const items = await leerCesta();
  const i = items.findIndex(([x]) => x === p.id);
  if (i >= 0) items[i] = [p.id, Math.min(tope, items[i][1] + cantidad)];
  else items.push([p.id, Math.min(tope, cantidad)]);
  await guardarCesta(items);
  redirect("/tienda/cesta?aviso=anadido");
}

/** Cambia la cantidad de una línea (0 = quitar). */
export async function cambiarCantidad(formData: FormData): Promise<void> {
  const id = String(formData.get("productoId") ?? "");
  const cantidad = Math.min(MAX_UNIDADES, Math.max(0, Math.floor(Number(formData.get("cantidad")) || 0)));
  const items = (await leerCesta()).map(([x, n]): [string, number] => (x === id ? [x, cantidad] : [x, n])).filter(([, n]) => n > 0);
  await guardarCesta(items);
  redirect("/tienda/cesta");
}

/**
 * «Tramitar pedido»: guarda la cesta ya ajustada (agotados fuera, cantidades al stock).
 * Si algo ha cambiado, vuelve a la cesta para que la clienta lo vea; si no, sigue.
 */
export async function tramitar(): Promise<void> {
  const { lineas, cambio } = await calcularCesta(await leerCesta());
  await guardarCesta(lineas.map((l): [string, number] => [l.productoId, l.cantidad]));
  if (!lineas.length) redirect("/tienda/cesta");
  redirect(cambio ? "/tienda/cesta?aviso=ajustada" : "/tienda/finalizar");
}

// ── Pedido ───────────────────────────────────────────────────────────────────

const Esquema = z.object({
  nombre: z.string().trim().min(3, "Pon tu nombre y apellidos.").max(160),
  email: z.email("Pon un email válido: ahí te mandamos la confirmación.").max(191),
  telefono: z.string().trim().min(6, "Pon tu teléfono.").max(32),
  metodoEnvioId: ULID.or(z.literal("")),
  direccion: z.string().trim().max(200).default(""),
  cp: z.string().trim().max(10).default(""),
  ciudad: z.string().trim().max(100).default(""),
  provincia: z.string().trim().max(100).default(""),
  notas: z.string().trim().max(1000).default(""),
  pago: z.string().max(20),
});

export async function crearPedido(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const r = Esquema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  if (formData.get("acepto") !== "on") return { error: "Tienes que aceptar las condiciones de venta." };
  const telefono = normalizarTelefono(d.telefono);
  if (!telefono) return { error: "Teléfono no válido." };

  const pasarela = proveedor(d.pago);
  if (!pasarela) return { error: "Ahora mismo no se pueden hacer pagos online. Inténtalo más tarde o llámanos." };

  const [metodo] = d.metodoEnvioId
    ? await db.select().from(metodoEnvio).where(and(eq(metodoEnvio.id, d.metodoEnvioId), eq(metodoEnvio.activo, true))).limit(1)
    : [];
  if (!metodo) return { error: "Elige cómo quieres recibir el pedido." };
  let direccion = null;
  if (metodo.tipo === "envio") {
    if (d.direccion.length < 5) return { error: "Pon la dirección de entrega." };
    if (!/^\d{5}$/.test(d.cp)) return { error: "Código postal no válido (5 cifras)." };
    if (d.ciudad.length < 2) return { error: "Pon la población." };
    if (d.provincia.length < 2) return { error: "Pon la provincia." };
    direccion = { nombre: d.nombre, direccion: d.direccion, cp: d.cp, ciudad: d.ciudad, provincia: d.provincia };
  }

  // Precios y stock recalculados aquí, en el servidor.
  const { lineas, cambio } = await calcularCesta(await leerCesta());
  if (!lineas.length) return { error: "Tu cesta está vacía." };
  if (cambio) return { error: "Tu cesta ha cambiado (algún producto se ha agotado). Vuelve a la cesta y pulsa «Tramitar pedido»." };
  const t = totales(
    lineas.map((l) => ({ precio: l.precio.precio, cantidad: l.cantidad, tipoIva: l.tipoIva })),
    { precio: metodo.precio, gratisDesde: metodo.gratisDesde },
  );

  const token = randomBytes(24).toString("base64url");
  const creado = await db.transaction(async (tx) => {
    const c = await buscarOCrearCliente(tx, {
      nombre: d.nombre,
      telefono: d.telefono,
      email: d.email,
      origen: "web",
      consiente: formData.get("novedades") === "on",
    });
    const numero = await siguienteNumeroPedido(tx);

    const [p] = await tx
      .insert(pedido)
      .values({
        numero,
        clienteId: c.id,
        nombre: d.nombre,
        email: d.email.toLowerCase(),
        telefono,
        metodoEnvioId: metodo.id,
        envioNombre: metodo.nombre,
        envioTipo: metodo.tipo,
        direccion,
        notas: d.notas || null,
        ...t,
        metodoPago: pasarela.id,
        tokenAcceso: token,
      })
      .$returningId();
    await tx.insert(pedidoLinea).values(
      lineas.map((l) => ({
        pedidoId: p.id,
        productoId: l.productoId,
        referencia: l.referencia,
        nombre: l.nombre,
        precio: l.precio.precio,
        precioOriginal: l.precio.original,
        oferta: l.precio.oferta?.nombre ?? null,
        tipoIva: l.tipoIva,
        cantidad: l.cantidad,
      })),
    );
    return { id: p.id, numero };
  });

  await guardarCesta([]);
  const { url } = await pasarela.iniciar({ pedidoId: creado.id, numero: creado.numero, total: t.total, token });
  redirect(url);
}

/** Volver a intentar el pago de un pedido pendiente. */
export async function pagarPedido(formData: FormData): Promise<void> {
  const numero = String(formData.get("n") ?? "");
  const token = String(formData.get("t") ?? "");
  const [p] = await db
    .select({ id: pedido.id, numero: pedido.numero, total: pedido.total, estado: pedido.estado, metodo: pedido.metodoPago, token: pedido.tokenAcceso })
    .from(pedido)
    .where(and(eq(pedido.numero, numero), eq(pedido.tokenAcceso, token)))
    .limit(1);
  if (!p) redirect("/tienda");
  const volver = `/tienda/pedido?n=${encodeURIComponent(p.numero)}&t=${encodeURIComponent(p.token)}`;
  if (p.estado !== "pendiente_pago") redirect(volver);
  const pasarela = proveedor(p.metodo ?? "");
  if (!pasarela) redirect(`${volver}&aviso=sin-pago`);
  const { url } = await pasarela.iniciar({ pedidoId: p.id, numero: p.numero, total: p.total, token: p.token });
  redirect(url);
}
