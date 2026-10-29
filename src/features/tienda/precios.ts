// Precio de venta con ofertas. Función pura: se usa al mostrar el catálogo y, sobre todo,
// en el servidor al calcular el carrito y el pedido (el navegador nunca decide el precio).

export type OfertaPrecio = {
  id: string;
  nombre: string;
  productoId: string | null;
  categoriaId: string | null;
  tipo: "porcentaje" | "importe";
  valor: number;
  inicio: Date;
  fin: Date;
};

export type PrecioFinal = {
  /** Lo que se cobra (céntimos, IVA incluido). */
  precio: number;
  /** Precio sin oferta. */
  original: number;
  oferta: { id: string; nombre: string; porcentaje: number } | null;
};

/** Categoría y todas sus superiores (una oferta en «Molekula» vale para «Molekula › Esmaltes»). */
export function cadenaCategorias(categoriaId: string | null, padres: Map<string, string | null>): string[] {
  const salida: string[] = [];
  let actual = categoriaId;
  while (actual && !salida.includes(actual)) {
    salida.push(actual);
    actual = padres.get(actual) ?? null;
  }
  return salida;
}

export function aplicarOferta(precio: number, o: Pick<OfertaPrecio, "tipo" | "valor">): number {
  const final =
    o.tipo === "porcentaje" ? Math.round((precio * (100 - Math.min(Math.max(o.valor, 0), 100))) / 100) : precio - Math.max(o.valor, 0);
  return Math.max(0, final);
}

/** Si hay varias ofertas vigentes, se aplica la que deja el precio más bajo. */
export function precioFinal(
  p: { id: string; precio: number; categoriaId: string | null },
  ofertas: OfertaPrecio[],
  padres: Map<string, string | null>,
  ahora: Date,
): PrecioFinal {
  const cats = cadenaCategorias(p.categoriaId, padres);
  let mejor: PrecioFinal = { precio: p.precio, original: p.precio, oferta: null };
  for (const o of ofertas) {
    if (!(o.inicio <= ahora && ahora < o.fin)) continue;
    const aplica = (o.productoId && o.productoId === p.id) || (o.categoriaId && cats.includes(o.categoriaId));
    if (!aplica) continue;
    const precio = aplicarOferta(p.precio, o);
    if (precio < mejor.precio) {
      mejor = {
        precio,
        original: p.precio,
        oferta: { id: o.id, nombre: o.nombre, porcentaje: p.precio ? Math.round(((p.precio - precio) / p.precio) * 100) : 0 },
      };
    }
  }
  return mejor;
}

const formato = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
/** 1995 → «19,95 €» */
export function euros(centimos: number): string {
  return formato.format(centimos / 100);
}

/** «19,95» o «19.95» o «19» → 1995. null si no es un importe válido. */
export function leerEuros(texto: string): number | null {
  const limpio = texto.trim().replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null;
  return Math.round(Number(limpio) * 100);
}
