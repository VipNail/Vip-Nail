import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cursoDeAlumna } from "@/features/cuenta/consultas";
import { exigirAlumna } from "@/lib/sesion";

export const metadata: Metadata = { title: "Curso", robots: { index: false, follow: false } };

export default async function CursoAlumna({ searchParams }: PageProps<"/cuenta/curso">) {
  const a = await exigirAlumna();
  const { id } = await searchParams;
  const d = typeof id === "string" ? await cursoDeAlumna(a.clienteId, id) : null;
  if (!d) notFound();
  const { curso, lecciones } = d;
  const vistas = lecciones.filter((l) => l.vista).length;
  const seguir = lecciones.find((l) => !l.vista) ?? lecciones[0];
  const modulos = [...new Set(lecciones.map((l) => l.modulo ?? ""))];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <Link href="/cuenta" className="text-sm text-texto-suave underline-offset-4 hover:underline">
        ← Mis cursos
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-marca">{curso.titulo}</h1>
        <p className="text-sm text-texto-suave">
          {vistas} de {lecciones.length} lecciones vistas
        </p>
      </div>
      {seguir && (
        <Link href={`/cuenta/leccion?id=${seguir.id}`} className="flex h-12 items-center justify-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover sm:self-start">
          {vistas === 0 ? "Empezar el curso" : vistas === lecciones.length ? "Repasar desde el principio" : "Seguir donde lo dejé"}
        </Link>
      )}
      {!lecciones.length && <p className="text-texto-suave">Las lecciones se publicarán muy pronto.</p>}
      {modulos.map((m) => (
        <section key={m} className="flex flex-col gap-2">
          {m && <h2 className="font-medium">{m}</h2>}
          <ol className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
            {lecciones
              .filter((l) => (l.modulo ?? "") === m)
              .map((l) => (
                <li key={l.id}>
                  <Link href={`/cuenta/leccion?id=${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fondo">
                    <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${l.vista ? "border-marca bg-marca text-sobre-marca" : "border-borde"}`}>
                      {l.vista ? "✓" : ""}
                    </span>
                    <span className="flex-1">
                      {l.titulo}
                      <span className="sr-only">{l.vista ? " (vista)" : ""}</span>
                    </span>
                    {l.duracionMin ? <span className="shrink-0 text-sm text-texto-suave">{l.duracionMin} min</span> : null}
                  </Link>
                </li>
              ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
