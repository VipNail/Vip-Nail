import "server-only";
// Pasarelas de pago detrás de una interfaz común (ARQUITECTURA §5). Previsto: Redsys (tarjeta y
// Bizum) y PayPal, pendiente de P2. Mientras tanto hay un proveedor de PRUEBAS que solo existe
// fuera de producción. Regla de oro: solo el aviso firmado de la pasarela marca un pago.
import { createHmac, timingSafeEqual } from "node:crypto";

export type DatosCobro = { pedidoId: string; numero: string; total: number; token: string };

export interface ProveedorPago {
  id: string;
  /** Lo que ve la clienta al elegir cómo pagar. */
  nombre: string;
  disponible(): boolean;
  /** Devuelve la dirección a la que se manda a la clienta para pagar. */
  iniciar(d: DatosCobro): Promise<{ url: string }>;
}

// ── Proveedor de pruebas ─────────────────────────────────────────────────────

export function pagosDePrueba(): boolean {
  return (process.env.ENTORNO ?? "local") !== "produccion";
}

function clave(): Buffer {
  const secreto = process.env.BETTER_AUTH_SECRET;
  if (!secreto) throw new Error("Falta BETTER_AUTH_SECRET");
  return createHmac("sha256", secreto).update("vipnails:pago-prueba").digest();
}

/** Firma de la «notificación» simulada: como haría Redsys con sus parámetros. */
export function firmarPrueba(pedidoId: string, importe: number, resultado: "ok" | "ko"): string {
  return createHmac("sha256", clave()).update(`${pedidoId}|${importe}|${resultado}`).digest("base64url");
}

export function verificarPrueba(pedidoId: string, importe: number, resultado: string, firma: string): boolean {
  if (resultado !== "ok" && resultado !== "ko") return false;
  const esperada = Buffer.from(firmarPrueba(pedidoId, importe, resultado));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

const prueba: ProveedorPago = {
  id: "prueba",
  nombre: "Pago de prueba (simulado)",
  disponible: pagosDePrueba,
  async iniciar(d) {
    return { url: `/tienda/pago-prueba?n=${encodeURIComponent(d.numero)}&t=${encodeURIComponent(d.token)}` };
  },
};

// DEBT: añadir Redsys (tarjeta + Bizum) y PayPal cuando se resuelva P2.
const TODOS: ProveedorPago[] = [prueba];

export function proveedoresDisponibles(): ProveedorPago[] {
  return TODOS.filter((p) => p.disponible());
}

export function proveedor(id: string): ProveedorPago | null {
  return proveedoresDisponibles().find((p) => p.id === id) ?? null;
}
