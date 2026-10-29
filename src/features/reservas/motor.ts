// Motor de huecos: función pura (sin BD) que calcula a qué horas se puede reservar un
// servicio un día concreto. Se usa en la web pública, en la agenda del CRM y al confirmar
// (allí se vuelve a comprobar el hueco dentro de una transacción).
import { diaSemana, madridAUtc, sumarDias, fechaMadrid } from "./tiempo";

export type Intervalo = { inicio: Date; fin: Date };

export type ProfesionalMotor = {
  staffId: string;
  /** Franjas del horario semanal, en minutos desde 00:00 hora de Madrid. */
  horario: { diaSemana: number; inicioMin: number; finMin: number }[];
};

export type EntradaMotor = {
  /** Día a calcular, «AAAA-MM-DD» (hora de Madrid). */
  fecha: string;
  servicio: { duracionMin: number; margenMin: number };
  /** Profesionales que hacen este servicio (ya filtradas por la persona elegida, si la hay). */
  profesionales: ProfesionalMotor[];
  /** Citas que ocupan agenda (todas salvo canceladas). */
  citas: { id?: string; staffId: string; inicio: Date; fin: Date; margenMin: number }[];
  /** Bloqueos; staffId nulo = todo el estudio. */
  bloqueos: { staffId: string | null; inicio: Date; fin: Date }[];
  ajustes: { antelacionMinMin: number; ventanaMaxDias: number; pasoMin: number };
  ahora: Date;
  /** Al cambiar de hora una cita, no cuenta como ocupada consigo misma. */
  ignorarCitaId?: string;
};

export type Hueco = {
  inicio: Date;
  fin: Date;
  /** Quién puede atender a esa hora («sin preferencia»: se elige una de ellas). */
  staffIds: string[];
};

const MIN = 60_000;

function solapa(a: Intervalo, b: Intervalo) {
  return a.inicio < b.fin && b.inicio < a.fin;
}

export function calcularHuecos(e: EntradaMotor): Hueco[] {
  const { duracionMin, margenMin } = e.servicio;
  const paso = Math.max(5, Math.round(e.ajustes.pasoMin));
  if (duracionMin <= 0) return [];

  const minimo = new Date(e.ahora.getTime() + e.ajustes.antelacionMinMin * MIN);
  // La ventana cuenta en días completos: se puede reservar hasta el final del día límite.
  const ultimoDia = sumarDias(fechaMadrid(e.ahora), e.ajustes.ventanaMaxDias);
  if (e.fecha > ultimoDia) return [];

  const dia = diaSemana(e.fecha);
  const porHora = new Map<number, Hueco>();

  for (const p of e.profesionales) {
    const ocupado: Intervalo[] = [
      ...e.citas
        .filter((c) => c.staffId === p.staffId && (e.ignorarCitaId === undefined || c.id !== e.ignorarCitaId))
        .map((c) => ({ inicio: c.inicio, fin: new Date(c.fin.getTime() + c.margenMin * MIN) })),
      ...e.bloqueos
        .filter((b) => b.staffId === null || b.staffId === p.staffId)
        .map((b) => ({ inicio: b.inicio, fin: b.fin })),
    ];

    for (const franja of p.horario.filter((h) => h.diaSemana === dia)) {
      const finFranja = madridAUtc(e.fecha, franja.finMin);
      // Los inicios van alineados al principio de la franja, de «paso» en «paso».
      for (let m = franja.inicioMin; m + duracionMin <= franja.finMin; m += paso) {
        const inicio = madridAUtc(e.fecha, m);
        const fin = new Date(inicio.getTime() + duracionMin * MIN);
        // El servicio debe acabar dentro de la franja (también en días con cambio de hora).
        if (fin > finFranja) break;
        if (inicio < minimo) continue;
        // La cita ocupa su duración más el margen de limpieza.
        const bloque = { inicio, fin: new Date(fin.getTime() + margenMin * MIN) };
        if (ocupado.some((o) => solapa(bloque, o))) continue;

        const clave = inicio.getTime();
        const h = porHora.get(clave) ?? { inicio, fin, staffIds: [] };
        if (!h.staffIds.includes(p.staffId)) h.staffIds.push(p.staffId);
        porHora.set(clave, h);
      }
    }
  }

  return [...porHora.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
