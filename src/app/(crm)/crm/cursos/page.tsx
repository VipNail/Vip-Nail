import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, BotonSecundario } from "@/components/ui/campo";
import { cargarEjemploAcademia } from "@/features/academia/acciones";
import { listarCursos } from "@/features/academia/consultas";
import { euros } from "@/features/tienda/precios";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Cursos" };

export default async function Cursos({ searchParams }: PageProps<"/crm/cursos">) {
  await exigirEquipo("cursos.gestionar");
  const sp = await searchParams;
  const cursos = await listarCursos();
  const grupos = [
    { titulo: "Presenciales", lista: cursos.filter((c) => c.tipo === "presencial") },
    { titulo: "Online", lista: cursos.filter((c) => c.tipo === "online") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-marca">Cursos</h1>
          <p className="text-sm text-texto-suave">
            {cursos.length} {cursos.length === 1 ? "curso" : "cursos"} ·{" "}
            <Link href="/academia" className="underline underline-offset-4">
              ver la academia
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/cursos/editar?tipo=presencial" className="flex h-12 items-center rounded-full bg-marca px-5 font-medium text-sobre-marca hover:bg-marca-hover">
            Nuevo presencial
          </Link>
          <Link href="/crm/cursos/editar?tipo=online" className="flex h-12 items-center rounded-full border border-marca px-5 font-medium text-marca">
            Nuevo online
          </Link>
        </div>
      </div>

      {sp.aviso === "ejemplo" && <Aviso tipo="ok">Cursos de ejemplo cargados. Míralos en vipnail.es/academia</Aviso>}

      {!cursos.length ? (
        <section className="flex flex-col gap-3 rounded-xl border border-acento bg-superficie p-4">
          <h2 className="font-medium">Aún no hay cursos</h2>
          <p className="text-sm text-texto-suave">Puedes crearlos a mano o cargar 5 cursos de ejemplo (3 online y 2 presenciales con fechas) para ver cómo queda.</p>
          <form action={cargarEjemploAcademia}>
            <BotonSecundario type="submit" className="w-full sm:w-auto">
              Cargar cursos de ejemplo
            </BotonSecundario>
          </form>
        </section>
      ) : (
        grupos.map(
          (g) =>
            g.lista.length > 0 && (
              <section key={g.titulo} className="flex flex-col gap-2">
                <h2 className="text-lg font-medium">{g.titulo}</h2>
                <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
                  {g.lista.map((c) => (
                    <li key={c.id}>
                      <Link href={`/crm/cursos/ver?id=${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-fondo">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{c.titulo}</span>
                          <span className="text-sm text-texto-suave">
                            {c.tipo === "online" ? `${c.lecciones} lecciones · ${c.alumnas} alumnas` : c.duracion ?? "Presencial"}
                            {!c.visible && " · oculto"}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium">{euros(c.precio)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )
      )}
    </main>
  );
}
