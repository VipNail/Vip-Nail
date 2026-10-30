// Ficha de producto. Se llega por /tienda/<slug> (regla en next.config.ts).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { anadirACesta } from "@/features/tienda/acciones-web";
import { productoPublico } from "@/features/tienda/consultas";
import { FotoProvisional, Precio } from "@/features/tienda/ui/tarjeta";

async function leer(searchParams: PageProps<"/tienda/ficha">["searchParams"]) {
  const { slug } = await searchParams;
  return typeof slug === "string" ? productoPublico(slug) : null;
}

export async function generateMetadata({ searchParams }: PageProps<"/tienda/ficha">): Promise<Metadata> {
  const p = await leer(searchParams);
  if (!p) return { title: "Producto no encontrado" };
  return {
    title: p.nombre,
    description: (p.descripcion ?? `${p.nombre}${p.marca ? ` de ${p.marca}` : ""}. Tienda de VIP Nail Studio.`).slice(0, 155),
    alternates: { canonical: `/tienda/${p.slug}` },
  };
}

export default async function Ficha({ searchParams }: PageProps<"/tienda/ficha">) {
  const p = await leer(searchParams);
  if (!p) notFound();
  const hay = p.stock > 0;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <nav aria-label="Migas" className="flex flex-wrap gap-1 text-sm text-texto-suave">
        <Link href="/tienda" className="underline-offset-4 hover:underline">
          Tienda
        </Link>
        {p.grupo && (
          <>
            <span aria-hidden>›</span>
            <Link href={`/tienda?categoria=${p.grupo.slug}`} className="underline-offset-4 hover:underline">
              {p.grupo.nombre}
            </Link>
          </>
        )}
        {p.categoria && (
          <>
            <span aria-hidden>›</span>
            <Link href={`/tienda?categoria=${p.categoria.slug}`} className="underline-offset-4 hover:underline">
              {p.categoria.nombre}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-6 md:grid-cols-2">
        <FotoProvisional nombre={p.nombre} grande />
        <div className="flex flex-col gap-4">
          <div>
            {p.marca && (
              <Link href={`/tienda?marca=${p.marcaSlug}`} className="text-sm uppercase tracking-wide text-texto-suave underline-offset-4 hover:underline">
                {p.marca}
              </Link>
            )}
            <h1 className="text-2xl font-semibold text-marca">{p.nombre}</h1>
            <p className="text-sm text-texto-suave">Ref. {p.referencia}</p>
          </div>

          <div className="flex flex-col gap-1">
            <Precio p={p.precioFinal} grande />
            {p.precioFinal.oferta && (
              <span className="text-sm font-medium text-error">
                {p.precioFinal.oferta.nombre} · -{p.precioFinal.oferta.porcentaje} %
              </span>
            )}
            <span className="text-xs text-texto-suave">IVA incluido</span>
          </div>

          <p className={`text-sm font-medium ${hay ? "text-marca" : "text-error"}`}>
            {hay ? (p.stock <= 3 ? `¡Quedan ${p.stock}!` : "En stock") : "Agotado"}
          </p>

          {hay ? (
            <form action={anadirACesta} className="flex gap-2">
              <input type="hidden" name="productoId" value={p.id} />
              <label className="sr-only" htmlFor="cantidad">
                Cantidad
              </label>
              <select id="cantidad" name="cantidad" defaultValue="1" className="h-12 rounded-full border border-borde bg-superficie px-3 text-base">
                {Array.from({ length: Math.min(p.stock, 10) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-12 flex-1 rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover">
                Añadir a la cesta
              </button>
            </form>
          ) : (
            <button type="button" disabled className="h-12 rounded-full bg-marca px-6 font-medium text-sobre-marca opacity-50">
              Agotado
            </button>
          )}

          {p.descripcion && <div className="whitespace-pre-line text-texto">{p.descripcion}</div>}
        </div>
      </div>
    </main>
  );
}
