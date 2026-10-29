import type { Metadata } from "next";
import Link from "next/link";
import { arbolCategorias, catalogo, listarMarcas, ORDENES, type Orden } from "@/features/tienda/consultas";
import { Tarjeta } from "@/features/tienda/ui/tarjeta";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Productos profesionales de manicura y pedicura: esmaltes, bases, herramientas y desinfección.",
  alternates: { canonical: "/tienda" },
};

export default async function Tienda({ searchParams }: PageProps<"/tienda">) {
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = texto("q").slice(0, 100);
  const orden = (texto("orden") in ORDENES ? texto("orden") : "nombre") as Orden;
  const soloOferta = texto("oferta") === "1";
  const conStock = texto("stock") === "1";

  const [{ raices, todas }, marcas] = await Promise.all([arbolCategorias(true), listarMarcas()]);
  const cat = todas.find((c) => c.slug === texto("categoria")) ?? null;
  const grupo = cat?.parentId ? todas.find((c) => c.id === cat.parentId) : cat;
  const marcaSel = marcas.find((m) => m.slug === texto("marca")) ?? null;
  const r = await catalogo({ q, categoriaId: cat?.id, marcaId: marcaSel?.id, soloOferta, conStock, orden, pagina: Number(texto("pagina")) || 1 });

  const actual = { q, categoria: cat?.slug ?? "", marca: marcaSel?.slug ?? "", oferta: soloOferta ? "1" : "", stock: conStock ? "1" : "", orden: orden === "nombre" ? "" : orden };
  const enlace = (cambios: Partial<Record<keyof typeof actual | "pagina", string>>) => {
    const p = new URLSearchParams({ ...actual, ...cambios });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/tienda${p.size ? `?${p}` : ""}`;
  };
  const titulo = cat ? (cat.parentId && grupo ? `${grupo.nombre} › ${cat.nombre}` : cat.nombre) : q ? `Resultados para «${q}»` : "Tienda";

  const filtros = (
    <div className="flex flex-col gap-5">
      <nav aria-label="Categorías" className="flex flex-col gap-1 text-sm">
        <Link href={enlace({ categoria: "", pagina: "" })} className={`rounded px-2 py-1.5 ${!cat ? "bg-marca text-sobre-marca" : "hover:bg-superficie"}`}>
          Todo
        </Link>
        {raices.map((g) => (
          <div key={g.id} className="flex flex-col">
            <Link href={enlace({ categoria: g.slug, pagina: "" })} className={`rounded px-2 py-1.5 font-medium ${cat?.id === g.id ? "bg-marca text-sobre-marca" : "hover:bg-superficie"}`}>
              {g.nombre}
            </Link>
            {grupo?.id === g.id &&
              g.hijas.map((h) => (
                <Link key={h.id} href={enlace({ categoria: h.slug, pagina: "" })} className={`ml-3 rounded px-2 py-1.5 ${cat?.id === h.id ? "bg-marca text-sobre-marca" : "hover:bg-superficie"}`}>
                  {h.nombre}
                </Link>
              ))}
          </div>
        ))}
      </nav>
      <form action="/tienda" className="flex flex-col gap-3 text-sm">
        {q && <input type="hidden" name="q" value={q} />}
        {cat && <input type="hidden" name="categoria" value={cat.slug} />}
        {marcas.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Marca</span>
            <select name="marca" defaultValue={marcaSel?.slug ?? ""} className="h-11 rounded-lg border border-borde bg-superficie px-2 text-base">
              <option value="">Todas</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.slug}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-medium">Ordenar</span>
          <select name="orden" defaultValue={orden} className="h-11 rounded-lg border border-borde bg-superficie px-2 text-base">
            {Object.entries(ORDENES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="oferta" value="1" defaultChecked={soloOferta} className="size-5" /> Solo ofertas
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" name="stock" value="1" defaultChecked={conStock} className="size-5" /> Solo con stock
        </label>
        <button type="submit" className="h-11 rounded-full bg-marca font-medium text-sobre-marca">
          Aplicar
        </button>
      </form>
    </div>
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <aside className="hidden w-60 shrink-0 lg:block">{filtros}</aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-marca">{titulo}</h1>
          <p className="text-sm text-texto-suave">
            {r.total} {r.total === 1 ? "producto" : "productos"}
            {marcaSel ? ` · ${marcaSel.nombre}` : ""}
            {soloOferta ? " · en oferta" : ""}
          </p>
        </div>

        <details className="rounded-xl border border-borde lg:hidden">
          <summary className="cursor-pointer px-4 py-3 font-medium">Categorías y filtros</summary>
          <div className="border-t border-borde p-4">{filtros}</div>
        </details>

        {r.productos.length === 0 ? (
          <p className="rounded-xl border border-borde p-6 text-center text-texto-suave">
            No hay productos que coincidan.{" "}
            <Link href="/tienda" className="underline underline-offset-4">
              Ver todo
            </Link>
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {r.productos.map((p) => (
              <li key={p.id}>
                <Tarjeta p={p} />
              </li>
            ))}
          </ul>
        )}

        {r.paginas > 1 && (
          <nav className="flex items-center justify-between text-sm" aria-label="Páginas">
            {r.pagina > 1 ? (
              <Link href={enlace({ pagina: String(r.pagina - 1) })} className="rounded-full border border-borde px-4 py-2">
                ‹ Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-texto-suave">
              Página {r.pagina} de {r.paginas}
            </span>
            {r.pagina < r.paginas ? (
              <Link href={enlace({ pagina: String(r.pagina + 1) })} className="rounded-full border border-borde px-4 py-2">
                Siguiente ›
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
