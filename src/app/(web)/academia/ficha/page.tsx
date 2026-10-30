// Ficha de curso. Se llega por /academia/<slug> (regla en next.config.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { convocatoriasDe, cursoPorSlug, temario } from "@/features/academia/consultas";
import { euros } from "@/features/tienda/precios";

async function leer(searchParams: PageProps<"/academia/ficha">["searchParams"]) {
  const { slug } = await searchParams;
  return typeof slug === "string" ? cursoPorSlug(slug) : null;
}

export async function generateMetadata({ searchParams }: PageProps<"/academia/ficha">): Promise<Metadata> {
  const c = await leer(searchParams);
  if (!c) return { title: "Curso no encontrado" };
  return {
    title: c.titulo,
    description: (c.resumen ?? `${c.titulo}: curso ${c.tipo} de VIP Nail School.`).slice(0, 155),
    alternates: { canonical: `/academia/${c.slug}` },
  };
}

const dia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

export default async function FichaCurso({ searchParams }: PageProps<"/academia/ficha">) {
  const c = await leer(searchParams);
  if (!c) notFound();
  const [lecciones, fechas] = await Promise.all([
    c.tipo === "online" ? temario(c.id) : Promise.resolve([]),
    c.tipo === "presencial" ? convocatoriasDe(c.id, { soloFuturas: true }) : Promise.resolve([]),
  ]);
  const abiertas = fechas.filter((f) => f.estado !== "cancelada");
  const modulos = [...new Set(lecciones.map((l) => l.modulo ?? ""))];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <Link href="/academia" className="text-sm text-texto-suave underline-offset-4 hover:underline">
        ← Academia
      </Link>
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-texto-suave">
          {c.tipo === "online" ? "Curso online" : "Curso presencial"}
          {c.nivel ? ` · ${c.nivel}` : ""}
          {c.duracion ? ` · ${c.duracion}` : ""}
        </span>
        <h1 className="text-3xl font-semibold text-marca">{c.titulo}</h1>
        {c.resumen && <p className="text-lg">{c.resumen}</p>}
        <p className="text-2xl font-semibold">
          {euros(c.precio)} <span className="text-xs font-normal text-texto-suave">IVA incluido</span>
        </p>
      </div>

      {c.tipo === "online" && (
        <Link href={`/academia/inscripcion?curso=${c.id}`} className="flex h-12 items-center justify-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover sm:self-start">
          Comprar el curso
        </Link>
      )}

      {c.descripcion && <div className="whitespace-pre-line">{c.descripcion}</div>}

      {c.tipo === "presencial" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-medium">Próximas fechas</h2>
          {!abiertas.length && <p className="text-texto-suave">Ahora mismo no hay fechas publicadas. Escríbenos y te avisamos de la próxima.</p>}
          <ul className="flex flex-col gap-3">
            {abiertas.map((f) => {
              const abierta = f.estado === "abierta" && f.libres > 0;
              return (
                <li key={f.id} className="flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4">
                  <span className="font-medium first-letter:uppercase">{dia.format(f.inicio)}</span>
                  <span className="text-sm text-texto-suave">
                    {[f.horario, f.lugar].filter(Boolean).join(" · ")}
                  </span>
                  <span className={`text-sm font-medium ${abierta ? "text-marca" : "text-error"}`}>
                    {f.estado === "cerrada" ? "Inscripción cerrada" : f.libres <= 0 ? "Completo" : f.libres <= 3 ? `¡Quedan ${f.libres} plazas!` : `${f.libres} plazas libres`}
                  </span>
                  {abierta && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {f.precioSenal !== null && f.precioSenal < c.precio && (
                        <Link href={`/academia/inscripcion?convocatoria=${f.id}&modalidad=senal`} className="flex h-11 items-center justify-center rounded-full border border-marca px-5 font-medium text-marca">
                          Reservar con {euros(f.precioSenal)} de señal
                        </Link>
                      )}
                      <Link href={`/academia/inscripcion?convocatoria=${f.id}&modalidad=total`} className="flex h-11 items-center justify-center rounded-full bg-marca px-5 font-medium text-sobre-marca hover:bg-marca-hover">
                        Pagar el curso ({euros(c.precio)})
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {c.tipo === "online" && lecciones.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-medium">Temario · {lecciones.length} lecciones</h2>
          {modulos.map((m) => (
            <div key={m} className="flex flex-col gap-1">
              {m && <h3 className="font-medium">{m}</h3>}
              <ol className="flex flex-col divide-y divide-borde rounded-xl border border-borde">
                {lecciones
                  .filter((l) => (l.modulo ?? "") === m)
                  .map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                      <span>{l.titulo}</span>
                      {l.duracionMin ? <span className="shrink-0 text-texto-suave">{l.duracionMin} min</span> : null}
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
