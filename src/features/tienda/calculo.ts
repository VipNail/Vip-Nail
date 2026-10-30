// Cálculos de la cesta y del pedido. Funciones puras (con pruebas): el servidor las usa al
// mostrar la cesta y, sobre todo, al crear el pedido. El navegador nunca decide importes.

export type LineaCalculo = { precio: number; cantidad: number; tipoIva: number };
export type EnvioCalculo = { precio: number; gratisDesde: number | null };

export const MAX_UNIDADES = 99;
export const MAX_LINEAS = 50;
/** IVA de los gastos de envío. */
export const IVA_ENVIO = 21;

export function subtotal(lineas: LineaCalculo[]): number {
  return lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);
}

export function costeEnvio(metodo: EnvioCalculo, sub: number): number {
  if (metodo.gratisDesde !== null && sub >= metodo.gratisDesde) return 0;
  return metodo.precio;
}

export function totales(lineas: LineaCalculo[], metodo: EnvioCalculo | null) {
  const sub = subtotal(lineas);
  const envio = metodo ? costeEnvio(metodo, sub) : 0;
  return { subtotal: sub, envio, total: sub + envio };
}

/**
 * Cuánto IVA va incluido, por tipo (precios con IVA incluido). Solo informativo: la factura
 * la hace Factusol. Redondeo por tipo, no por línea.
 */
export function desgloseIva(lineas: LineaCalculo[], envio = 0): { tipo: number; base: number; cuota: number }[] {
  const porTipo = new Map<number, number>();
  for (const l of lineas) porTipo.set(l.tipoIva, (porTipo.get(l.tipoIva) ?? 0) + l.precio * l.cantidad);
  if (envio > 0) porTipo.set(IVA_ENVIO, (porTipo.get(IVA_ENVIO) ?? 0) + envio);
  return [...porTipo.entries()]
    .filter(([, total]) => total > 0)
    .sort(([a], [b]) => b - a)
    .map(([tipo, total]) => {
      const base = Math.round((total * 100) / (100 + tipo));
      return { tipo, base, cuota: total - base };
    });
}

/** Cuánto falta para el envío gratis (null si no aplica o ya lo es). */
export function faltaParaGratis(metodo: EnvioCalculo, sub: number): number | null {
  if (metodo.gratisDesde === null || metodo.precio === 0) return null;
  const falta = metodo.gratisDesde - sub;
  return falta > 0 ? falta : null;
}

/** «VN-2026-00042» */
export function numeroPedido(anio: number, n: number): string {
  return `VN-${anio}-${String(n).padStart(5, "0")}`;
}

/** Cesta guardada en la cookie: [[productoId, cantidad], …], saneada. */
export function leerCestaTexto(texto: string | undefined): [string, number][] {
  if (!texto) return [];
  try {
    const datos: unknown = JSON.parse(texto);
    if (!Array.isArray(datos)) return [];
    const vistos = new Map<string, number>();
    for (const x of datos) {
      if (!Array.isArray(x) || typeof x[0] !== "string" || x[0].length !== 26) continue;
      const n = Math.floor(Number(x[1]));
      if (!Number.isFinite(n) || n < 1) continue;
      vistos.set(x[0], Math.min(MAX_UNIDADES, (vistos.get(x[0]) ?? 0) + n));
    }
    return [...vistos.entries()].slice(0, MAX_LINEAS);
  } catch {
    return [];
  }
}
