import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/ui/campo";
import { cambiarActivo } from "@/features/equipo/acciones";
import { obtenerPersona } from "@/features/equipo/consultas";
import { exigirEquipo } from "@/lib/sesion";
import { FormularioPersona } from "../formulario";
import { BotonConfirmar } from "./confirmar";

export const metadata: Metadata = { title: "Editar persona" };

const AVISOS: Record<string, string> = {
  "no-a-ti": "No puedes desactivar tu propia cuenta.",
  "ultima-admin": "Tiene que quedar al menos una persona de administración activa.",
};

// Ruta con ?id= en vez de carpeta [id]: la subida por la web de GitHub no admite corchetes.
export default async function EditarPersona({ searchParams }: PageProps<"/crm/equipo/editar">) {
  const yo = await exigirEquipo("equipo.gestionar");
  const { id, aviso } = await searchParams;
  const persona = typeof id === "string" ? await obtenerPersona(id) : null;
  if (!persona) notFound();

  const esYo = persona.id === yo.staffId;
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/equipo" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Equipo
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">{persona.nombre}</h1>
        {!persona.activo && <p className="text-sm text-error">Desactivada: no puede entrar al CRM.</p>}
      </div>

      {mensaje && <Aviso>{mensaje}</Aviso>}

      <FormularioPersona persona={persona} esYo={esYo} />

      <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
        <h2 className="font-medium">Acceso al CRM</h2>
        {esYo ? (
          <p className="text-sm text-texto-suave">Es tu cuenta: no puedes desactivarla tú.</p>
        ) : persona.activo ? (
          <>
            <p className="text-sm text-texto-suave">
              Si desactivas a esta persona, se cierra su sesión y no podrá volver a entrar. Su historial se
              conserva y puedes reactivarla cuando quieras.
            </p>
            <form action={cambiarActivo}>
              <input type="hidden" name="id" value={persona.id} />
              <BotonConfirmar pregunta={`¿Desactivar a ${persona.nombre}?`}>Desactivar</BotonConfirmar>
            </form>
          </>
        ) : (
          <form action={cambiarActivo}>
            <input type="hidden" name="id" value={persona.id} />
            <input type="hidden" name="activar" value="1" />
            <BotonConfirmar>Reactivar</BotonConfirmar>
          </form>
        )}
      </section>
    </main>
  );
}
