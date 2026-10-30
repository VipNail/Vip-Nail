import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marcarLeccion } from "@/features/cuenta/acciones";
import { leccionDeAlumna } from "@/features/cuenta/consultas";
import { exigirAlumna } from "@/lib/sesion";

export const metadata: Metadata = { title: "Lección", robots: { index: false, follow: false } };

// El reproductor solo se pinta aquí, tras comprobar en servidor que la alumna tiene acceso.
// La privacidad de Vimeo («solo incrustar en nuestro dominio») impide verlo fuera de la web.
export default async function Leccion({ searchParams }: PageProps<"/cuenta/leccion">) {
  const a = await exigirAlumna();
  const { id } = await searchParams;
  const d = typeof id === "string" ? await leccionDeAlumna(a.clienteId, id) : null;
  if (!d) notFound();
  const { leccion: l, curso, vista, anterior, siguiente } = d;
  const src = l.vimeoId ? `https://player.vimeo.com/video/${l.vimeoId}?${new URLSearchParams({ ...(l.vimeoHash ? { h: l.vimeoHash } : {}), dnt: "1", title: "0", byline: "0", portrait: "0" })}` : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
      <Link href={`/cuenta/curso?id=${curso.id}`} className="text-sm text-texto-suave underline-offset-4 hover:underline">
        ← {curso.titulo}
      </Link>
      <div>
        <p className="text-xs uppercase tracking-wide text-texto-suave">
          Lección {d.posicion} de {d.total}
          {l.modulo ? ` · ${l.modulo}` : ""}
        </p>
        <h1 className="text-2xl font-semibold text-marca">{l.titulo}</h1>
      </div>

      {src ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
          <iframe
            src={src}
            title={l.titulo}
            className="absolute inset-0 size-full"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-borde bg-superficie p-6 text-center text-texto-suave">El vídeo de esta lección estará disponible muy pronto.</p>
      )}

      {l.descripcion && <div className="whitespace-pre-line">{l.descripcion}</div>}

      <form action={marcarLeccion} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="hidden" name="leccionId" value={l.id} />
        <input type="hidden" name="vista" value={vista ? "0" : "1"} />
        {siguiente && <input type="hidden" name="siguiente" value={siguiente.id} />}
        <button type="submit" className={`h-12 rounded-full px-6 font-medium ${vista ? "border border-marca text-marca" : "bg-marca text-sobre-marca hover:bg-marca-hover"}`}>
          {vista ? "✓ Vista (desmarcar)" : siguiente ? "Marcar como vista y seguir" : "Marcar como vista"}
        </button>
      </form>

      <nav className="flex justify-between gap-3 border-t border-borde pt-4 text-sm" aria-label="Lecciones">
        {anterior ? (
          <Link href={`/cuenta/leccion?id=${anterior.id}`} className="underline underline-offset-4">
            ← {anterior.titulo}
          </Link>
        ) : (
          <span />
        )}
        {siguiente ? (
          <Link href={`/cuenta/leccion?id=${siguiente.id}`} className="text-right underline underline-offset-4">
            {siguiente.titulo} →
          </Link>
        ) : (
          <Link href={`/cuenta/curso?id=${curso.id}`} className="text-right underline underline-offset-4">
            Volver al temario
          </Link>
        )}
      </nav>
    </main>
  );
}
