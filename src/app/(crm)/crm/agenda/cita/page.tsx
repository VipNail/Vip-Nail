import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Boton, BotonSecundario, Campo, Selector } from "@/components/ui/campo";
import { BotonConfirmar } from "@/app/(crm)/crm/equipo/editar/confirmar";
import { cambiarEstadoCita, guardarNotasCita, moverCita } from "@/features/agenda/acciones";
import { obtenerCita } from "@/features/agenda/consultas";
import { huecosDelDia, listarPersonasActivas } from "@/features/reservas/consultas";
import { fechaMadrid, horaMadrid, leerFecha } from "@/features/reservas/tiempo";
import { tienePermiso } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";
import { ESTADO_CITA } from "@/features/agenda/estados";

export const metadata: Metadata = { title: "Cita" };

const fechaLarga = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

const AVISOS: Record<string, { texto: string; ok: boolean }> = {
  movida: { texto: "Cita cambiada de hora.", ok: true },
  ocupado: { texto: "Esa hora ya no está libre. Elige otra.", ok: false },
  error: { texto: "No se pudo cambiar la cita.", ok: false },
  completada: { texto: "Marcada como hecha.", ok: true },
  no_vino: { texto: "Marcada como «no vino».", ok: true },
  cancelada: { texto: "Cita cancelada. Su hora queda libre.", ok: true },
  confirmada: { texto: "Cita vuelta a confirmada.", ok: true },
  notas: { texto: "Notas guardadas.", ok: true },
};

export default async function Cita({ searchParams }: PageProps<"/crm/agenda/cita">) {
  const yo = await exigirEquipo("agenda.ver");
  const gestiona = tienePermiso(yo.rol, "agenda.gestionar");
  const q = await searchParams;
  const c = typeof q.id === "string" ? await obtenerCita(q.id) : null;
  // Una profesional solo ve sus propias citas.
  if (!c || (!gestiona && c.staffId !== yo.staffId)) notFound();

  const fechaCita = fechaMadrid(c.inicio);
  const aviso = typeof q.aviso === "string" ? AVISOS[q.aviso] : undefined;

  // Cambio de hora: se muestra al pedirlo (?mover=1).
  const mover = gestiona && c.estado === "confirmada" && q.mover === "1";
  const hoy = fechaMadrid(new Date());
  const fechaMover = typeof q.fecha === "string" && leerFecha(q.fecha) && q.fecha >= hoy ? q.fecha : fechaCita >= hoy ? fechaCita : hoy;
  const personaMover = typeof q.persona === "string" ? q.persona : "";
  const [personas, opciones] = mover
    ? await Promise.all([
        listarPersonasActivas(),
        huecosDelDia({ servicioId: c.servicioId, fecha: fechaMover, staffId: personaMover || null, ignorarCitaId: c.id, modo: "equipo" }),
      ])
    : [[], null];
  const nombre = new Map(personas.map((p) => [p.id, p.nombre]));

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href={`/crm/agenda?fecha=${fechaCita}`} className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Agenda
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">{c.clienta}</h1>
        <p className="first-letter:uppercase">
          {fechaLarga.format(c.inicio)} · {horaMadrid(c.inicio)}–{horaMadrid(c.fin)}
        </p>
      </div>

      {aviso && <Aviso tipo={aviso.ok ? "ok" : "error"}>{aviso.texto}</Aviso>}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl border border-borde bg-superficie p-4 text-sm">
        <dt className="text-texto-suave">Estado</dt>
        <dd>
          <span className={`rounded-full border px-2 text-xs ${ESTADO_CITA[c.estado].clase}`}>{ESTADO_CITA[c.estado].texto}</span>
        </dd>
        <dt className="text-texto-suave">Servicio</dt>
        <dd>{c.servicio}</dd>
        <dt className="text-texto-suave">Con</dt>
        <dd>{c.persona}</dd>
        <dt className="text-texto-suave">Teléfono</dt>
        <dd>{c.telefono ? <a href={`tel:${c.telefono}`} className="underline underline-offset-4">{c.telefono}</a> : "—"}</dd>
        <dt className="text-texto-suave">Email</dt>
        <dd className="break-all">{c.email ? <a href={`mailto:${c.email}`} className="underline underline-offset-4">{c.email}</a> : "—"}</dd>
        <dt className="text-texto-suave">Origen</dt>
        <dd>{{ web: "Web", telefono: "Teléfono", presencial: "En persona" }[c.origen]}</dd>
        {!gestiona && c.notas && (
          <>
            <dt className="text-texto-suave">Notas</dt>
            <dd className="whitespace-pre-line">{c.notas}</dd>
          </>
        )}
      </dl>

      {gestiona && c.estado !== "cancelada" && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Marcar</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {c.estado !== "completada" && (
              <form action={cambiarEstadoCita}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="estado" value="completada" />
                <BotonSecundario type="submit" className="w-full px-2">Hecha</BotonSecundario>
              </form>
            )}
            {c.estado !== "no_vino" && (
              <form action={cambiarEstadoCita}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="estado" value="no_vino" />
                <BotonSecundario type="submit" className="w-full px-2">No vino</BotonSecundario>
              </form>
            )}
            {c.estado !== "confirmada" && (
              <form action={cambiarEstadoCita}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="estado" value="confirmada" />
                <BotonSecundario type="submit" className="w-full px-2">Confirmada</BotonSecundario>
              </form>
            )}
            <form action={cambiarEstadoCita}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="estado" value="cancelada" />
              <BotonConfirmar pregunta={`¿Cancelar la cita de ${c.clienta}? Su hora quedará libre.`}>Cancelar</BotonConfirmar>
            </form>
          </div>
        </section>
      )}

      {gestiona && c.estado === "confirmada" && !mover && (
        <Link
          href={`/crm/agenda/cita?id=${c.id}&mover=1`}
          className="flex h-12 items-center justify-center rounded-full border border-marca font-medium text-marca"
        >
          Cambiar día u hora
        </Link>
      )}

      {mover && opciones && (
        <section className="flex flex-col gap-4 rounded-xl border border-borde p-4">
          <h2 className="font-medium">Cambiar día u hora</h2>
          <form className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="mover" value="1" />
            <Campo etiqueta="Día" name="fecha" type="date" defaultValue={fechaMover} min={hoy} />
            <Selector etiqueta="Profesional" name="persona" defaultValue={personaMover}>
              <option value="">Cualquiera (mejor la misma)</option>
              {personas
                .filter((p) => opciones.servicio?.staffIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </Selector>
            <Boton type="submit" className="sm:col-span-2">Ver horas libres</Boton>
          </form>
          {opciones.huecos.length === 0 ? (
            <p className="text-sm text-texto-suave">No quedan horas libres ese día.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {opciones.huecos.map((h) => (
                <li key={h.inicio.toISOString()}>
                  <form action={moverCita}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="fecha" value={fechaMover} />
                    <input type="hidden" name="persona" value={personaMover} />
                    <input type="hidden" name="inicio" value={h.inicio.toISOString()} />
                    <button
                      type="submit"
                      className="flex w-full flex-col items-center rounded-lg border border-borde bg-superficie px-1 py-2 hover:border-marca"
                    >
                      <span className="font-medium">{horaMadrid(h.inicio)}</span>
                      {!personaMover && (
                        <span className="w-full truncate text-xs text-texto-suave">
                          {h.staffIds.map((x) => nombre.get(x) ?? "?").join(", ")}
                        </span>
                      )}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/crm/agenda/cita?id=${c.id}`} className="text-center text-sm underline underline-offset-4">
            No cambiar
          </Link>
        </section>
      )}

      {gestiona && (
        <form action={guardarNotasCita} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={c.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Notas</span>
            <textarea
              name="notas"
              defaultValue={c.notas ?? ""}
              maxLength={1000}
              className="min-h-24 rounded-lg border border-borde bg-superficie px-3 py-2 text-base"
            />
          </label>
          <BotonSecundario type="submit" className="w-full sm:w-auto sm:self-end">Guardar notas</BotonSecundario>
        </form>
      )}
    </main>
  );
}
