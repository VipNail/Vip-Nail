import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/campo";
import { agendaDelDia, type ColumnaAgenda } from "@/features/agenda/consultas";
import { ESTADO_CITA } from "@/features/agenda/estados";
import { listarPersonasActivas } from "@/features/reservas/consultas";
import { aHora, fechaMadrid, horaMadrid, leerFecha, sumarDias } from "@/features/reservas/tiempo";
import { tienePermiso } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Agenda" };

const fechaLarga = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });


export default async function Agenda({ searchParams }: PageProps<"/crm/agenda">) {
  const yo = await exigirEquipo("agenda.ver");
  const gestiona = tienePermiso(yo.rol, "agenda.gestionar");
  const q = await searchParams;
  const hoy = fechaMadrid(new Date());
  const fecha = typeof q.fecha === "string" && leerFecha(q.fecha) ? q.fecha : hoy;

  // Quien solo ve la agenda (profesional) ve la suya; el resto elige.
  const persona = gestiona ? (typeof q.persona === "string" && q.persona.length === 26 ? q.persona : null) : yo.staffId;
  const [columnas, personas] = await Promise.all([agendaDelDia(fecha, persona), gestiona ? listarPersonasActivas() : []]);
  const [a, m, d] = fecha.split("-").map(Number);
  const totalCitas = columnas.reduce(
    (n, c) => n + c.elementos.filter((e) => e.tipo === "cita" && e.estado !== "cancelada").length,
    0,
  );
  const enlace = (f: string) => `/crm/agenda?fecha=${f}${persona && gestiona ? `&persona=${persona}` : ""}`;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-marca">Agenda</h1>
        {gestiona && (
          <Link
            href={`/crm/agenda/nueva?fecha=${fecha}`}
            className="flex h-12 items-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover"
          >
            Nueva cita
          </Link>
        )}
      </div>

      {q.aviso === "creada" && <Aviso tipo="ok">Cita apuntada.</Aviso>}

      {/* Navegación por días */}
      <div className="flex flex-col gap-3 rounded-xl border border-borde bg-superficie p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Link href={enlace(sumarDias(fecha, -1))} aria-label="Día anterior" className="flex size-11 items-center justify-center rounded-full border border-borde text-xl">
            ‹
          </Link>
          <p className="min-w-0 flex-1 text-center font-medium first-letter:uppercase sm:w-56 sm:flex-none">
            {fechaLarga.format(new Date(Date.UTC(a, m - 1, d)))}
            {fecha === hoy && <span className="text-texto-suave"> · hoy</span>}
          </p>
          <Link href={enlace(sumarDias(fecha, 1))} aria-label="Día siguiente" className="flex size-11 items-center justify-center rounded-full border border-borde text-xl">
            ›
          </Link>
        </div>
        <form className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          {fecha !== hoy && (
            <Link href={enlace(hoy)} className="flex h-11 items-center rounded-full border border-borde px-4 text-sm">
              Hoy
            </Link>
          )}
          <input type="date" name="fecha" defaultValue={fecha} aria-label="Ir a un día" className="h-11 rounded-lg border border-borde bg-fondo px-2 text-base" />
          {gestiona && (
            <select name="persona" defaultValue={persona ?? ""} aria-label="Persona" className="h-11 rounded-lg border border-borde bg-fondo px-2 text-base">
              <option value="">Todo el equipo</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="h-11 rounded-full bg-marca px-4 text-sm font-medium text-sobre-marca">
            Ver
          </button>
        </form>
      </div>

      <p className="text-sm text-texto-suave">
        {totalCitas} {totalCitas === 1 ? "cita" : "citas"}
      </p>

      {columnas.length === 0 ? (
        <p className="rounded-xl border border-borde p-4 text-texto-suave">Este día no trabaja nadie y no hay citas.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columnas.map((c) => (
            <Columna key={c.staffId} columna={c} />
          ))}
        </div>
      )}
    </main>
  );
}

function Columna({ columna: c }: { columna: ColumnaAgenda }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-borde p-3">
      <header className="flex items-center gap-2">
        <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
        <h2 className="font-medium">{c.nombre}</h2>
        <span className="ml-auto text-xs text-texto-suave">
          {c.franjas.length ? c.franjas.map((f) => `${aHora(f.inicioMin)}–${aHora(f.finMin)}`).join(" · ") : "No trabaja"}
        </span>
      </header>
      {c.elementos.length === 0 ? (
        <p className="text-sm text-texto-suave">Sin citas.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {c.elementos.map((e) =>
            e.tipo === "bloqueo" ? (
              <li key={`b${e.id}`} className="rounded-lg border border-dashed border-borde px-3 py-2 text-sm text-texto-suave">
                {horaMadrid(e.inicio)}–{horaMadrid(e.fin)} · Bloqueado: {e.motivo}
                {e.todoElEstudio && " (todo el estudio)"}
              </li>
            ) : (
              <li key={e.id}>
                <Link
                  href={`/crm/agenda/cita?id=${e.id}`}
                  className={`flex gap-3 rounded-lg border bg-superficie px-3 py-2 hover:border-marca ${
                    e.estado === "cancelada" ? "border-borde opacity-50" : "border-borde"
                  }`}
                  style={{ borderLeft: `4px solid ${c.color}` }}
                >
                  <span className="w-12 shrink-0 font-medium tabular-nums">{horaMadrid(e.inicio)}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={`truncate font-medium ${e.estado === "cancelada" ? "line-through" : ""}`}>{e.clienta}</span>
                    <span className="truncate text-sm text-texto-suave">
                      {e.servicio} · hasta {horaMadrid(e.fin)}
                    </span>
                  </span>
                  {e.estado !== "confirmada" && (
                    <span className={`h-fit shrink-0 rounded-full border px-2 text-xs ${ESTADO_CITA[e.estado].clase}`}>
                      {ESTADO_CITA[e.estado].texto}
                    </span>
                  )}
                </Link>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
