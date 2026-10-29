import type { Metadata } from "next";
import { Aviso, Boton, BotonSecundario, Campo, Selector, TarjetaEnlace } from "@/components/ui/campo";
import { cargarEjemplo } from "@/features/reservas/acciones";
import { huecosDelDia, listarPersonasActivas, listarServicios, obtenerServicio } from "@/features/reservas/consultas";
import { fechaMadrid, horaMadrid, leerFecha } from "@/features/reservas/tiempo";
import { tienePermiso } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Reservas" };

const fechaLarga = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default async function Reservas({ searchParams }: PageProps<"/crm/reservas">) {
  const yo = await exigirEquipo("agenda.gestionar");
  const configura = tienePermiso(yo.rol, "reservas.configurar");
  const q = await searchParams;
  const [servicios, personas] = await Promise.all([listarServicios(), listarPersonasActivas()]);

  // Prueba de huecos (formulario GET: se puede compartir el enlace).
  const hoy = fechaMadrid(new Date());
  const servicioId = typeof q.servicio === "string" ? q.servicio : (servicios[0]?.id ?? "");
  const fecha = typeof q.fecha === "string" && leerFecha(q.fecha) ? q.fecha : hoy;
  const staffId = typeof q.persona === "string" && q.persona ? q.persona : null;
  const probar = typeof q.servicio === "string" && servicioId;

  const elegido = servicioId ? await obtenerServicio(servicioId) : null;
  const resultado = probar ? await huecosDelDia({ servicioId, fecha, staffId }) : null;
  const nombre = new Map(personas.map((p) => [p.id, p.nombre]));
  const [a, m, d] = fecha.split("-").map(Number);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-marca">Reservas</h1>
        <p className="text-sm text-texto-suave">Qué se puede reservar, quién lo hace y cuándo.</p>
      </div>

      {q.aviso === "ejemplo" && (
        <Aviso tipo="ok">Datos de ejemplo cargados. Cámbialos o archívalos cuando tengas los reales.</Aviso>
      )}

      {configura && servicios.length === 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-acento bg-superficie p-4">
          <h2 className="font-medium">Aún no hay servicios</h2>
          <p className="text-sm text-texto-suave">
            Puedes crearlos uno a uno o cargar unos de ejemplo (manicura, acrílicas, pedicura y retirada) con un horario
            de lunes a sábado para todo el equipo, y así probar cómo salen los huecos.
          </p>
          <form action={cargarEjemplo}>
            <BotonSecundario type="submit" className="w-full sm:w-auto">
              Cargar datos de ejemplo
            </BotonSecundario>
          </form>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {configura && (
          <TarjetaEnlace href="/crm/reservas/servicios" titulo="Servicios" texto="Duración, limpieza y quién los hace." />
        )}
        {configura && (
          <TarjetaEnlace href="/crm/reservas/horarios" titulo="Horarios" texto="Qué días y horas trabaja cada persona." />
        )}
        <TarjetaEnlace href="/crm/reservas/bloqueos" titulo="Vacaciones y bloqueos" texto="Días u horas en que no se puede reservar." />
        {configura && (
          <TarjetaEnlace href="/crm/reservas/ajustes" titulo="Ajustes" texto="Antelación, hasta cuándo y cada cuánto." />
        )}
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-borde p-4">
        <div>
          <h2 className="font-medium">Ver huecos libres</h2>
          <p className="text-sm text-texto-suave">Lo que vería una clienta al reservar ese servicio ese día.</p>
        </div>
        {servicios.length === 0 ? (
          <p className="text-sm text-texto-suave">Primero crea algún servicio.</p>
        ) : (
          <form className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <Selector etiqueta="Servicio" name="servicio" defaultValue={servicioId}>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} · {s.duracionMin} min
                </option>
              ))}
            </Selector>
            <Selector etiqueta="Profesional" name="persona" defaultValue={staffId ?? ""}>
              <option value="">Sin preferencia</option>
              {personas
                .filter((p) => !elegido || elegido.staffIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </Selector>
            <Campo etiqueta="Día" name="fecha" type="date" defaultValue={fecha} min={hoy} />
            <Boton type="submit" className="sm:col-span-3">
              Ver huecos
            </Boton>
          </form>
        )}

        {resultado && (
          <div className="flex flex-col gap-3">
            <p className="font-medium first-letter:uppercase">
              {fechaLarga.format(new Date(Date.UTC(a, m - 1, d)))}: {resultado.huecos.length}{" "}
              {resultado.huecos.length === 1 ? "hueco" : "huecos"}
            </p>
            {resultado.profesionales === 0 ? (
              <Aviso>Nadie del equipo tiene asignado este servicio. Asígnalo en Servicios.</Aviso>
            ) : resultado.huecos.length === 0 ? (
              <p className="text-sm text-texto-suave">
                No hay huecos: ese día no trabaja nadie que lo haga, está todo ocupado o bloqueado, o queda fuera de la
                antelación y del plazo máximo de reserva.
              </p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {resultado.huecos.map((h) => (
                  <li
                    key={h.inicio.toISOString()}
                    className="flex flex-col items-center rounded-lg border border-borde bg-superficie px-2 py-2 text-center"
                  >
                    <span className="font-medium">{horaMadrid(h.inicio)}</span>
                    {!staffId && (
                      <span className="w-full truncate text-xs text-texto-suave">
                        {h.staffIds.map((x) => nombre.get(x) ?? "?").join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
