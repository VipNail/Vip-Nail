// Conversión entre hora de Madrid y UTC sin librerías. Funciona con los cambios de hora
// (último domingo de marzo y de octubre). Sin dependencias de servidor: se puede probar suelto.
export const ZONA = "Europe/Madrid";

const partes = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Desfase de Madrid respecto a UTC en ese instante, en minutos (+60 invierno, +120 verano). */
export function desfaseMadrid(instante: Date): number {
  const p = Object.fromEntries(partes.formatToParts(instante).map((x) => [x.type, x.value]));
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60000);
}

/** Valida y separa una fecha «AAAA-MM-DD». */
export function leerFecha(fecha: string): { a: number; m: number; d: number } | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!r) return null;
  const [a, m, d] = [+r[1], +r[2], +r[3]];
  const x = new Date(Date.UTC(a, m - 1, d));
  if (x.getUTCFullYear() !== a || x.getUTCMonth() !== m - 1 || x.getUTCDate() !== d) return null;
  return { a, m, d };
}

/**
 * Instante UTC de una hora local de Madrid. `minutos` = minutos desde las 00:00 de ese día
 * (puede pasar de 1440 para «el día siguiente»). Una hora que no existe (el salto de las 2:00
 * a las 3:00 en marzo) se interpreta con el desfase de antes del cambio.
 */
export function madridAUtc(fecha: string, minutos: number): Date {
  const f = leerFecha(fecha);
  if (!f) throw new Error(`Fecha no válida: ${fecha}`);
  const local = Date.UTC(f.a, f.m - 1, f.d, 0, minutos);
  // Desfases posibles alrededor de esa hora (distintos solo en días de cambio de hora).
  const antes = desfaseMadrid(new Date(local - 12 * 3600_000));
  const despues = desfaseMadrid(new Date(local + 12 * 3600_000));
  for (const o of [antes, despues]) {
    const c = local - o * 60000;
    // Válido si en ese instante Madrid tiene justo ese desfase. En la hora repetida de
    // octubre gana la primera (horario de verano).
    if (desfaseMadrid(new Date(c)) === o) return new Date(c);
  }
  // Hora inexistente (salto de marzo): se usa el desfase de antes del cambio.
  return new Date(local - antes * 60000);
}

/** «AAAA-MM-DD» del día de Madrid en ese instante. */
export function fechaMadrid(instante: Date): string {
  const p = Object.fromEntries(partes.formatToParts(instante).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Día de la semana de una fecha: 1 = lunes … 7 = domingo. */
export function diaSemana(fecha: string): number {
  const f = leerFecha(fecha);
  if (!f) throw new Error(`Fecha no válida: ${fecha}`);
  const d = new Date(Date.UTC(f.a, f.m - 1, f.d)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Suma días a una fecha «AAAA-MM-DD». */
export function sumarDias(fecha: string, dias: number): string {
  const f = leerFecha(fecha);
  if (!f) throw new Error(`Fecha no válida: ${fecha}`);
  return new Date(Date.UTC(f.a, f.m - 1, f.d + dias)).toISOString().slice(0, 10);
}

/** «HH:MM» ↔ minutos desde medianoche. */
export function aMinutos(hhmm: string): number | null {
  const r = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return r ? +r[1] * 60 + +r[2] : null;
}
export function aHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

const formatoHora = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" });
/** Hora de Madrid de un instante, «HH:MM». */
export function horaMadrid(instante: Date): string {
  return formatoHora.format(instante);
}

/** Convierte «AAAA-MM-DDTHH:MM» (input datetime-local, hora de Madrid) a UTC. */
export function localAUtc(valor: string): Date | null {
  const r = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(valor);
  if (!r || !leerFecha(r[1])) return null;
  const min = aMinutos(r[2]);
  return min === null ? null : madridAUtc(r[1], min);
}
