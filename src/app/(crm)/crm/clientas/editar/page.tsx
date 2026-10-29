import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaTexto, Campo, Casilla } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { guardarClienta } from "@/features/clientas/acciones";
import { obtenerClienta } from "@/features/clientas/consultas";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ficha de clienta" };

// Sin ?id= es una clienta nueva.
export default async function EditarClienta({ searchParams }: PageProps<"/crm/clientas/editar">) {
  await exigirEquipo("clientas.gestionar");
  const { id } = await searchParams;
  const c = typeof id === "string" ? await obtenerClienta(id) : null;
  if (typeof id === "string" && (!c || c.borradaAt)) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link
          href={c ? `/crm/clientas/ficha?id=${c.id}` : "/crm/clientas"}
          className="text-sm text-texto-suave underline-offset-4 hover:underline"
        >
          {c ? "← Ficha" : "← Clientas"}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">{c ? `Editar ${c.nombre}` : "Nueva clienta"}</h1>
      </div>

      <FormularioAccion accion={guardarClienta} cancelar={c ? `/crm/clientas/ficha?id=${c.id}` : "/crm/clientas"}>
        {c && <input type="hidden" name="id" value={c.id} />}
        <Campo etiqueta="Nombre y apellidos" name="nombre" defaultValue={c?.nombre} required maxLength={160} autoComplete="off" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" defaultValue={c?.telefono ?? ""} maxLength={32} autoComplete="off" />
          <Campo etiqueta="Email" name="email" type="email" defaultValue={c?.email ?? ""} maxLength={191} autoComplete="off" />
        </div>
        <p className="-mt-3 text-sm text-texto-suave">Al menos uno de los dos. Sirven para no duplicar fichas.</p>
        <div className="flex flex-col gap-1">
          <Campo etiqueta="Etiquetas" name="etiquetas" defaultValue={(c?.etiquetas ?? []).join(", ")} placeholder="vip, alumna, uñas sensibles" maxLength={600} />
          <p className="text-sm text-texto-suave">Separadas por comas. Sirven para filtrar la lista.</p>
        </div>
        <AreaTexto etiqueta="Notas" name="notas" defaultValue={c?.notas ?? ""} maxLength={4000} placeholder="Preferencias, alergias que ella misma ha contado, colores favoritos…" />
        <Casilla
          name="consentimientoMarketing"
          defaultChecked={c?.consentimientoMarketing ?? false}
          etiqueta="Acepta recibir promociones y novedades"
        />
        <p className="-mt-3 text-sm text-texto-suave">
          Márcalo solo si ella lo ha dicho expresamente: se guarda la fecha como prueba del consentimiento.
        </p>
      </FormularioAccion>
    </main>
  );
}
