import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/campo";
import { listarServicios } from "@/features/reservas/consultas";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Servicios" };

const AVISOS: Record<string, string> = {
  guardado: "Servicio guardado.",
  archivado: "Servicio archivado: ya no se puede reservar. Sus citas antiguas se conservan.",
  recuperado: "Servicio recuperado.",
};

export default async function Servicios({ searchParams }: PageProps<"/crm/reservas/servicios">) {
  await exigirEquipo("reservas.configurar");
  const { aviso } = await searchParams;
  const todos = await listarServicios(true);
  const activos = todos.filter((s) => s.activo);
  const archivados = todos.filter((s) => !s.activo);
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/crm/reservas" className="text-sm text-texto-suave underline-offset-4 hover:underline">
            ← Reservas
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-marca">Servicios</h1>
        </div>
        <Link
          href="/crm/reservas/servicios/editar"
          className="flex h-12 items-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover"
        >
          Nuevo servicio
        </Link>
      </div>

      {mensaje && <Aviso tipo="ok">{mensaje}</Aviso>}

      {activos.length === 0 ? (
        <p className="text-sm text-texto-suave">Todavía no hay servicios.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {activos.map((s) => (
            <li key={s.id}>
              <Link
                href={`/crm/reservas/servicios/editar?id=${s.id}`}
                className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-4 hover:border-marca"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{s.nombre}</span>
                  <span className="text-sm text-texto-suave">
                    {s.categoria ? `${s.categoria} · ` : ""}
                    {s.duracionMin} min{s.margenMin ? ` + ${s.margenMin} de limpieza` : ""}
                  </span>
                </span>
                {!s.visible && (
                  <span className="shrink-0 rounded-full border border-borde px-2 text-xs text-texto-suave">Solo estudio</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {archivados.length > 0 && (
        <details className="rounded-xl border border-borde p-4">
          <summary className="cursor-pointer font-medium">Archivados ({archivados.length})</summary>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {archivados.map((s) => (
              <li key={s.id}>
                <Link href={`/crm/reservas/servicios/editar?id=${s.id}`} className="underline underline-offset-4">
                  {s.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
