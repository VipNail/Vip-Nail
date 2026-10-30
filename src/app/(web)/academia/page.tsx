import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { listarCursos } from "@/features/academia/consultas";
import { euros } from "@/features/tienda/precios";

export const metadata: Metadata = {
  title: "Academia: cursos de uñas online y presenciales",
  description: "Cursos de manicura y uñas de VIP Nail School: online a tu ritmo o presenciales en el estudio, con plazas limitadas.",
  alternates: { canonical: "/academia" },
};

export default async function Academia() {
  await connection(); // siempre con los datos del momento, nunca prerenderizada
  const cursos = await listarCursos(true);
  const online = cursos.filter((c) => c.tipo === "online");
  const presenciales = cursos.filter((c) => c.tipo === "presencial");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="text-3xl font-semibold text-marca">Academia</h1>
        <p className="mt-1 text-texto-suave">Aprende con Nadya: cursos online a tu ritmo y formaciones presenciales en el estudio.</p>
      </div>
      {!cursos.length && <p className="text-texto-suave">Pronto publicaremos los cursos.</p>}
      <Bloque titulo="Cursos presenciales" cursos={presenciales} />
      <Bloque titulo="Cursos online" cursos={online} />
    </main>
  );
}

function Bloque({ titulo, cursos }: { titulo: string; cursos: Awaited<ReturnType<typeof listarCursos>> }) {
  if (!cursos.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-medium">{titulo}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cursos.map((c) => (
          <li key={c.id}>
            <Link href={`/academia/${c.slug}`} className="flex h-full flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4 hover:border-marca">
              <span className="text-xs uppercase tracking-wide text-texto-suave">
                {c.tipo === "online" ? "Online" : "Presencial"}
                {c.nivel ? ` · ${c.nivel}` : ""}
                {c.duracion ? ` · ${c.duracion}` : ""}
              </span>
              <span className="text-lg font-medium text-marca">{c.titulo}</span>
              {c.resumen && <span className="text-sm text-texto">{c.resumen}</span>}
              <span className="mt-auto pt-2 font-semibold">{euros(c.precio)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
