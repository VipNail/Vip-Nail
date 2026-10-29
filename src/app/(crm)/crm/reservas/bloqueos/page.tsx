import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Campo, Selector } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonConfirmar } from "@/app/(crm)/crm/equipo/editar/confirmar";
import { borrarBloqueo, crearBloqueo } from "@/features/reservas/acciones";
import { listarBloqueosVigentes, listarPersonasActivas } from "@/features/reservas/consultas";
import { fechaMadrid } from "@/features/reservas/tiempo";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Vacaciones y bloqueos" };

const formato = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

const AVISOS: Record<string, string> = {
  creado: "Bloqueo creado. Esas horas ya no se pueden reservar.",
  borrado: "Bloqueo quitado.",
};

export default async function Bloqueos({ searchParams }: PageProps<"/crm/reservas/bloqueos">) {
  await exigirEquipo("agenda.gestionar");
  const { aviso } = await searchParams;
  const [bloqueos, personas] = await Promise.all([listarBloqueosVigentes(), listarPersonasActivas()]);
  const hoy = fechaMadrid(new Date());
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/reservas" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Reservas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Vacaciones y bloqueos</h1>
        <p className="text-sm text-texto-suave">
          Vacaciones, festivos, médico o una pausa: durante ese tiempo no se puede reservar. Las citas que ya hubiera
          no se borran.
        </p>
      </div>

      {mensaje && <Aviso tipo="ok">{mensaje}</Aviso>}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Próximos</h2>
        {bloqueos.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay ninguno.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {bloqueos.map((b) => (
              <li key={b.id} className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">
                    {b.motivo} · <span className="font-normal">{b.staffId ? b.persona : "Todo el estudio"}</span>
                  </span>
                  <span className="text-sm text-texto-suave">
                    {formato.format(b.inicio)} → {formato.format(b.fin)}
                  </span>
                </div>
                <form action={borrarBloqueo}>
                  <input type="hidden" name="id" value={b.id} />
                  <BotonConfirmar pregunta={`¿Quitar el bloqueo «${b.motivo}»?`}>Quitar</BotonConfirmar>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
        <h2 className="font-medium">Nuevo bloqueo</h2>
        <FormularioAccion accion={crearBloqueo} boton="Bloquear">
          <Selector etiqueta="Para quién" name="quien" defaultValue="">
            <option value="">Todo el estudio (festivo, cierre)</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Selector>
          <Campo etiqueta="Desde" name="desde" type="datetime-local" defaultValue={`${hoy}T00:00`} required />
          <Campo etiqueta="Hasta" name="hasta" type="datetime-local" defaultValue={`${hoy}T23:59`} required />
          <Campo etiqueta="Motivo" name="motivo" placeholder="Vacaciones, festivo, médico…" maxLength={160} required />
        </FormularioAccion>
      </section>
    </main>
  );
}
