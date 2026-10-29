import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaTexto, BotonSecundario, Campo, Casilla } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { cambiarArchivoServicio, guardarServicio } from "@/features/reservas/acciones";
import { listarPersonasActivas, obtenerServicio } from "@/features/reservas/consultas";
import { NOMBRE_ROL } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Servicio" };

// Sin ?id= es un servicio nuevo.
export default async function EditarServicio({ searchParams }: PageProps<"/crm/reservas/servicios/editar">) {
  await exigirEquipo("reservas.configurar");
  const { id } = await searchParams;
  const s = typeof id === "string" ? await obtenerServicio(id) : null;
  if (typeof id === "string" && !s) notFound();
  const personas = await listarPersonasActivas();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/reservas/servicios" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Servicios
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">{s ? s.nombre : "Nuevo servicio"}</h1>
        {s && !s.activo && <p className="text-sm text-error">Archivado: no se puede reservar.</p>}
      </div>

      <FormularioAccion accion={guardarServicio} cancelar="/crm/reservas/servicios">
        {s && <input type="hidden" name="id" value={s.id} />}
        <Campo etiqueta="Nombre" name="nombre" defaultValue={s?.nombre} required maxLength={120} />
        <Campo etiqueta="Categoría (opcional)" name="categoria" defaultValue={s?.categoria ?? ""} placeholder="Manos, Pies…" maxLength={80} />
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Duración (min)" name="duracionMin" type="number" inputMode="numeric" min={5} max={600} step={5} defaultValue={s?.duracionMin ?? 60} required />
          <Campo etiqueta="Limpieza después (min)" name="margenMin" type="number" inputMode="numeric" min={0} max={120} step={5} defaultValue={s?.margenMin ?? 10} required />
        </div>
        <p className="-mt-3 text-sm text-texto-suave">
          La limpieza no la ve la clienta: solo separa esta cita de la siguiente.
        </p>
        <AreaTexto etiqueta="Descripción (opcional)" name="descripcion" defaultValue={s?.descripcion ?? ""} maxLength={2000} />
        <Campo etiqueta="Orden en la lista" name="orden" type="number" inputMode="numeric" min={0} max={9999} defaultValue={s?.orden ?? 0} />
        <Casilla etiqueta="Se puede reservar desde la web" name="visible" defaultChecked={s ? s.visible : true} />

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Quién lo hace</legend>
          {personas.length === 0 ? (
            <p className="text-sm text-texto-suave">No hay nadie activo en el equipo.</p>
          ) : (
            personas.map((p) => (
              <Casilla
                key={p.id}
                name="staffIds"
                value={p.id}
                defaultChecked={s ? s.staffIds.includes(p.id) : true}
                etiqueta={
                  <>
                    {p.nombre} <span className="text-sm text-texto-suave">· {NOMBRE_ROL[p.rol]}</span>
                  </>
                }
              />
            ))
          )}
        </fieldset>
      </FormularioAccion>

      {s && (
        <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
          <h2 className="font-medium">{s.activo ? "Archivar" : "Recuperar"}</h2>
          <p className="text-sm text-texto-suave">
            {s.activo
              ? "Deja de poder reservarse. Las citas que ya tenga se mantienen."
              : "Vuelve a estar disponible para reservar."}
          </p>
          <form action={cambiarArchivoServicio}>
            <input type="hidden" name="id" value={s.id} />
            {!s.activo && <input type="hidden" name="activar" value="1" />}
            <BotonSecundario type="submit" className="w-full sm:w-auto">
              {s.activo ? "Archivar servicio" : "Recuperar servicio"}
            </BotonSecundario>
          </form>
        </section>
      )}
    </main>
  );
}
