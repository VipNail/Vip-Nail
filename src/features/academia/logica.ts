// Reglas de la academia. Funciones puras (con pruebas).

/** Minutos que se guarda una plaza mientras la alumna paga. */
export const MINUTOS_RESERVA = 30;

/**
 * Lee un enlace de Vimeo y devuelve su número y, si es un vídeo oculto, su clave.
 * Vale: vimeo.com/123456789, vimeo.com/123456789/abc123def, player.vimeo.com/video/123456789?h=abc123def,
 * vimeo.com/manage/videos/123456789/abc123def, o solo «123456789».
 */
export function leerVimeo(texto: string): { id: string; hash: string | null } | null {
  const t = texto.trim();
  if (/^\d{6,12}$/.test(t)) return { id: t, hash: null };
  let url: URL;
  try {
    url = new URL(t.startsWith("http") ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (!/(^|\.)vimeo\.com$/.test(url.hostname)) return null;
  const partes = url.pathname.split("/").filter(Boolean);
  const i = partes.findIndex((p) => /^\d{6,12}$/.test(p));
  if (i < 0) return null;
  const siguiente = partes[i + 1];
  const hash = url.searchParams.get("h") ?? (siguiente && /^[a-f0-9]{6,40}$/i.test(siguiente) ? siguiente : null);
  return { id: partes[i], hash: hash && /^[a-f0-9]{6,40}$/i.test(hash) ? hash : null };
}

export type PlazaLogica = { estado: "reservada_pendiente" | "senal_pagada" | "pagada" | "cancelada"; caducaAt: Date | null };

/** ¿Esta plaza cuenta como ocupada ahora? Las reservas sin pagar caducan solas. */
export function ocupa(p: PlazaLogica, ahora: Date): boolean {
  if (p.estado === "senal_pagada" || p.estado === "pagada") return true;
  if (p.estado === "reservada_pendiente") return Boolean(p.caducaAt && p.caducaAt > ahora);
  return false;
}

export function plazasLibres(total: number, plazas: PlazaLogica[], ahora: Date): number {
  return Math.max(0, total - plazas.filter((p) => ocupa(p, ahora)).length);
}

/** ¿Se puede reservar en esta convocatoria? */
export function reservable(c: { estado: string; inicio: Date; plazas: number }, plazas: PlazaLogica[], ahora: Date): boolean {
  return c.estado === "abierta" && c.inicio > ahora && plazasLibres(c.plazas, plazas, ahora) > 0;
}

/** Lo que se cobra al reservar: la señal (si la hay y se elige) o el curso entero. */
export function importeReserva(precioCurso: number, precioSenal: number | null, modalidad: "senal" | "total"): number {
  if (modalidad === "senal" && precioSenal !== null && precioSenal > 0 && precioSenal < precioCurso) return precioSenal;
  return precioCurso;
}
