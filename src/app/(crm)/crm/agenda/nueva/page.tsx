import type { Metadata } from "next";
import Link from "next/link";
import { AreaTexto, Aviso, Boton, Campo, Selector } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { crearCita } from "@/features/agenda/acciones";
import { huecosDelDia, listarPersonasActivas, listarServicios } from "@/features/reservas/consultas";
import { fechaMadrid, horaMadrid, leerFecha } from "@/features/reservas/tiempo";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nueva cita" };

export default async function NuevaCita({ searchParams }: PageProps<"/crm/agenda/nueva">) {
  await exigirEquipo("agenda.gestionar");
  const q = await searchParams;
  const hoy = fechaMadrid(new Date());
  const fecha = typeof q.fecha === "string" && leerFecha(q.fecha) && q.fecha >= hoy ? q.fecha : hoy;
  const servicioId = typeof q.servicio === "string" ? q.servicio : "";
  const persona = typeof q.persona === "string" ? q.persona : "";

  const [servicios, personas] = await Promise.all([listarServicios(), listarPersonasActivas()]);
  const resultado = servicioId ? await huecosDelDia({ servicioId, fecha, staffId: persona || null, modo: "equipo" }) : null;
  const nombre = new Map(personas.map((p) => [p.id, p.nombre]));
  const queHacen = resultado?.servicio?.staffIds ?? personas.map((p) => p.id);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href={`/crm/agenda?fecha=${fecha}`} className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Agenda
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Nueva cita</h1>
        <p className="text-sm text-texto-suave">Para citas por teléfono o en persona.</p>
      </div>

      {servicios.length === 0 ? (
        <Aviso>
          No hay servicios. Créalos en <Link href="/crm/reservas/servicios" className="underline">Reservas → Servicios</Link>.
        </Aviso>
      ) : (
        <form className="flex flex-col gap-4 rounded-xl border border-borde p-4">
          <h2 className="font-medium">1. Qué, con quién y qué día</h2>
          <Selector etiqueta="Servicio" name="servicio" defaultValue={servicioId || servicios[0].id}>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} · {s.duracionMin} min
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Profesional" name="persona" defaultValue={persona}>
            <option value="">Sin preferencia</option>
            {personas
              .filter((p) => queHacen.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
          </Selector>
          <Campo etiqueta="Día" name="fecha" type="date" defaultValue={fecha} min={hoy} required />
          <Boton type="submit">Ver horas libres</Boton>
        </form>
      )}

      {resultado && (
        <section className="flex flex-col gap-4 rounded-xl border border-borde p-4">
          <h2 className="font-medium">2. Hora y clienta</h2>
          {resultado.profesionales === 0 ? (
            <Aviso>Nadie del equipo hace este servicio. Asígnalo en Reservas → Servicios.</Aviso>
          ) : resultado.huecos.length === 0 ? (
            <p className="text-sm text-texto-suave">
              No quedan horas libres ese día (nadie trabaja, está todo ocupado o hay un bloqueo). Prueba otro día u otra persona.
            </p>
          ) : (
            <FormularioAccion accion={crearCita} boton="Apuntar cita">
              <input type="hidden" name="servicioId" value={servicioId} />
              <input type="hidden" name="persona" value={persona} />
              <input type="hidden" name="fecha" value={fecha} />

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Hora</legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {resultado.huecos.map((h, i) => (
                    <label
                      key={h.inicio.toISOString()}
                      className="flex cursor-pointer flex-col items-center rounded-lg border border-borde bg-superficie px-1 py-2 text-center has-[:checked]:border-marca has-[:checked]:bg-marca has-[:checked]:text-sobre-marca"
                    >
                      <input type="radio" name="inicio" value={h.inicio.toISOString()} defaultChecked={i === 0} className="sr-only" required />
                      <span className="font-medium">{horaMadrid(h.inicio)}</span>
                      {!persona && (
                        <span className="w-full truncate text-xs opacity-80">{h.staffIds.map((x) => nombre.get(x) ?? "?").join(", ")}</span>
                      )}
                    </label>
                  ))}
                </div>
                {!persona && (
                  <p className="text-sm text-texto-suave">Sin preferencia: se asigna la primera persona libre a esa hora.</p>
                )}
              </fieldset>

              <Campo etiqueta="Nombre de la clienta" name="nombre" autoComplete="off" required maxLength={160} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" autoComplete="off" maxLength={32} />
                <Campo etiqueta="Email (opcional)" name="email" type="email" autoComplete="off" maxLength={191} />
              </div>
              <p className="-mt-3 text-sm text-texto-suave">
                Si ya existe una clienta con ese teléfono o email, la cita va a su ficha.
              </p>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Cómo ha llegado</legend>
                <div className="flex gap-2">
                  {[
                    ["telefono", "Por teléfono"],
                    ["presencial", "En persona"],
                  ].map(([valor, texto], i) => (
                    <label
                      key={valor}
                      className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-borde has-[:checked]:border-marca has-[:checked]:bg-marca has-[:checked]:text-sobre-marca"
                    >
                      <input type="radio" name="origen" value={valor} defaultChecked={i === 0} className="sr-only" />
                      {texto}
                    </label>
                  ))}
                </div>
              </fieldset>

              <AreaTexto etiqueta="Notas (opcional)" name="notas" maxLength={1000} />
            </FormularioAccion>
          )}
        </section>
      )}
    </main>
  );
}
