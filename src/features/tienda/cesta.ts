import "server-only";
// Cesta de la compra: en una cookie solo van [productoId, cantidad]. Nombres, precios, ofertas
// y stock se leen siempre de la base de datos en el servidor.
import { cookies } from "next/headers";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { marca, metodoEnvio, producto } from "@/db/schema";
import { leerCestaTexto, MAX_UNIDADES } from "./calculo";
import { arbolCategorias, ofertasVigentes } from "./consultas";
import { precioFinal, type PrecioFinal } from "./precios";

export const COOKIE_CESTA = "vn_cesta";

export async function leerCesta(): Promise<[string, number][]> {
  return leerCestaTexto((await cookies()).get(COOKIE_CESTA)?.value);
}

export async function guardarCesta(items: [string, number][]) {
  const c = await cookies();
  if (!items.length) c.delete(COOKIE_CESTA);
  else
    c.set(COOKIE_CESTA, JSON.stringify(items), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
}

export type LineaCesta = {
  productoId: string;
  referencia: string;
  nombre: string;
  slug: string;
  marca: string | null;
  tipoIva: number;
  stock: number;
  cantidad: number;
  precio: PrecioFinal;
};

/**
 * Convierte la cesta guardada en líneas con precio actual. Quita lo que ya no se vende y
 * ajusta cantidades al stock; devuelve avisos para la clienta.
 */
export async function calcularCesta(items: [string, number][]) {
  const avisos: string[] = [];
  if (!items.length) return { lineas: [] as LineaCesta[], avisos, cambio: false };
  const ahora = new Date();
  const [{ todas, padres }, ofertas, filas] = await Promise.all([
    arbolCategorias(),
    ofertasVigentes(ahora),
    db
      .select({
        id: producto.id,
        referencia: producto.referencia,
        nombre: producto.nombre,
        slug: producto.slug,
        precio: producto.precio,
        tipoIva: producto.tipoIva,
        stock: producto.stock,
        categoriaId: producto.categoriaId,
        marca: marca.nombre,
      })
      .from(producto)
      .leftJoin(marca, eq(marca.id, producto.marcaId))
      .where(and(eq(producto.activo, true), inArray(producto.id, items.map(([id]) => id)))),
  ]);
  const visible = (catId: string | null) => {
    if (!catId) return true;
    const c = todas.find((x) => x.id === catId);
    const p = c?.parentId ? todas.find((x) => x.id === c.parentId) : null;
    return Boolean(c?.visible) && (!p || p.visible);
  };

  let cambio = false;
  const lineas: LineaCesta[] = [];
  for (const [id, cantidad] of items) {
    const f = filas.find((x) => x.id === id);
    if (!f || !visible(f.categoriaId)) {
      avisos.push("Un producto de tu cesta ya no está a la venta y lo hemos quitado.");
      cambio = true;
      continue;
    }
    if (f.stock <= 0) {
      avisos.push(`«${f.nombre}» se ha agotado y lo hemos quitado de la cesta.`);
      cambio = true;
      continue;
    }
    let n = Math.min(cantidad, MAX_UNIDADES);
    if (n > f.stock) {
      avisos.push(`De «${f.nombre}» solo quedan ${f.stock}: hemos ajustado la cantidad.`);
      n = f.stock;
      cambio = true;
    }
    lineas.push({
      productoId: f.id,
      referencia: f.referencia,
      nombre: f.nombre,
      slug: f.slug,
      marca: f.marca,
      tipoIva: f.tipoIva,
      stock: f.stock,
      cantidad: n,
      precio: precioFinal({ id: f.id, precio: f.precio, categoriaId: f.categoriaId }, ofertas, padres, ahora),
    });
  }
  return { lineas, avisos, cambio };
}

/** Formas de entrega activas. Si no hay ninguna, crea las provisionales (hasta que Nadya confirme). */
export async function metodosEnvio(soloActivos = true) {
  let filas = await db.select().from(metodoEnvio).orderBy(asc(metodoEnvio.orden), asc(metodoEnvio.nombre));
  if (!filas.length) {
    // DEBT: importes provisionales: confirmar con Nadya (pregunta 13 de Factusol/migración).
    await db.insert(metodoEnvio).values([
      { nombre: "Recogida en el estudio", tipo: "recogida", descripcion: "Te avisamos cuando esté listo para recoger.", precio: 0, orden: 1 },
      { nombre: "Envío a domicilio (península)", tipo: "envio", descripcion: "Entrega en 24–48 h laborables.", precio: 495, gratisDesde: 5000, orden: 2 },
    ]);
    filas = await db.select().from(metodoEnvio).orderBy(asc(metodoEnvio.orden), asc(metodoEnvio.nombre));
  }
  return soloActivos ? filas.filter((m) => m.activo) : filas;
}
