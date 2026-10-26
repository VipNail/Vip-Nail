import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/campo";
import { listarEquipo } from "@/features/equipo/consultas";
import { NOMBRE_ROL } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Equipo" };

const AVISOS: Record<string, string> = {
  alta: "Persona dada de alta. Ya puede entrar con su email y la contraseña inicial.",
  guardado: "Cambios guardados.",
  desactivada: "Persona desactivada. Ya no puede entrar al CRM.",
  reactivada: "Persona reactivada. Vuelve a poder entrar.",
  "no-existe": "Esa persona ya no existe.",
};

export default async function Equipo({ searchParams }: PageProps<"/crm/equipo">) {
  const yo = await exigirEquipo("equipo.gestionar");
  const { aviso } = await searchParams;
  const personas = await listarEquipo();
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-marca">Equipo</h1>
          <p className="text-sm text-texto-suave">Quién entra al CRM y con qué rol.</p>
        </div>
        <Link
          href="/crm/equipo/alta"
          className="flex h-12 items-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover"
        >
          Añadir persona
        </Link>
      </div>

      {mensaje && <Aviso tipo={aviso === "no-existe" ? "error" : "ok"}>{mensaje}</Aviso>}

      <ul className="flex flex-col gap-3">
        {personas.map((p) => (
          <li key={p.id}>
            <Link
              href={`/crm/equipo/editar?id=${p.id}`}
              className={`flex items-center gap-3 rounded-xl border border-borde bg-superficie p-4 hover:border-marca ${
                p.activo ? "" : "opacity-60"
              }`}
            >
              <span
                aria-hidden
                className="size-4 shrink-0 rounded-full"
                style={{ backgroundColor: p.colorAgenda }}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {p.nombre}
                  {p.id === yo.staffId && <span className="font-normal text-texto-suave"> (tú)</span>}
                </span>
                <span className="truncate text-sm text-texto-suave">{p.email}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-sm">
                <span>{NOMBRE_ROL[p.rol]}</span>
                {!p.activo && (
                  <span className="rounded-full border border-error px-2 text-xs text-error">Desactivada</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
