import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, BotonSecundario, TarjetaEnlace } from "@/components/ui/campo";
import { cargarEjemploTienda } from "@/features/tienda/acciones";
import { arbolCategorias, productosCrm } from "@/features/tienda/consultas";
import { euros } from "@/features/tienda/precios";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Productos" };

const AVISOS: Record<string, string> = {
  guardado: "Producto guardado.",
  ejemplo: "Catálogo de ejemplo cargado. Míralo en la tienda: vipnail.es/tienda",
};

export default async function Productos({ searchParams }: PageProps<"/crm/productos">) {
  await exigirEquipo("productos.gestionar");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const categoriaId = typeof sp.categoria === "string" ? sp.categoria : "";
  const estado = typeof sp.estado === "string" ? sp.estado : "";
  const pagina = Number(sp.pagina) || 1;
  const [{ filas, total, paginas }, { raices }] = await Promise.all([
    productosCrm({ q, categoriaId, estado, pagina }),
    arbolCategorias(),
  ]);
  const vacio = total === 0 && !q && !categoriaId && !estado;
  const enlace = (n: number) => {
    const p = new URLSearchParams({ q, categoria: categoriaId, estado, pagina: String(n) });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/crm/productos?${p}`;
  };
  const mensaje = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-marca">Productos</h1>
          <p className="text-sm text-texto-suave">
            {total} {total === 1 ? "producto" : "productos"} ·{" "}
            <Link href="/tienda" className="underline underline-offset-4">
              ver la tienda
            </Link>
          </p>
        </div>
        <Link href="/crm/productos/editar" className="flex h-12 items-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover">
          Nuevo producto
        </Link>
      </div>

      {mensaje && <Aviso tipo="ok">{mensaje}</Aviso>}

      <div className="grid gap-3 sm:grid-cols-2">
        <TarjetaEnlace href="/crm/productos/categorias" titulo="Categorías y marcas" texto="Cómo se agrupa el catálogo en la tienda." />
        <TarjetaEnlace href="/crm/productos/ofertas" titulo="Ofertas" texto="Descuentos con fecha de inicio y fin." />
      </div>

      <p className="rounded-lg border border-borde bg-superficie px-3 py-2 text-sm text-texto-suave">
        Cuando conectemos Factusol, el nombre, el precio y el stock se actualizarán solos desde allí.
      </p>

      {vacio ? (
        <section className="flex flex-col gap-3 rounded-xl border border-acento bg-superficie p-4">
          <h2 className="font-medium">Aún no hay productos</h2>
          <p className="text-sm text-texto-suave">
            Puedes crearlos a mano o cargar un catálogo de ejemplo (3 grupos, 8 productos y una oferta) para ver cómo queda la tienda.
          </p>
          <form action={cargarEjemploTienda}>
            <BotonSecundario type="submit" className="w-full sm:w-auto">
              Cargar catálogo de ejemplo
            </BotonSecundario>
          </form>
        </section>
      ) : (
        <>
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <input type="search" name="q" defaultValue={q} placeholder="Nombre, referencia o código de barras" aria-label="Buscar producto" className="h-12 min-w-0 rounded-lg border border-borde bg-superficie px-3 text-base" />
            <select name="categoria" defaultValue={categoriaId} aria-label="Categoría" className="h-12 rounded-lg border border-borde bg-superficie px-2 text-base">
              <option value="">Todas las categorías</option>
              {raices.map((r) => [
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>,
                ...r.hijas.map((h) => (
                  <option key={h.id} value={h.id}>
                    — {h.nombre}
                  </option>
                )),
              ])}
              <option value="sin">Sin categoría</option>
            </select>
            <select name="estado" defaultValue={estado} aria-label="Estado" className="h-12 rounded-lg border border-borde bg-superficie px-2 text-base">
              <option value="">Todos</option>
              <option value="activos">A la venta</option>
              <option value="inactivos">Ocultos</option>
              <option value="sin-stock">Sin stock</option>
            </select>
            <button type="submit" className="h-12 rounded-full bg-marca px-5 font-medium text-sobre-marca">
              Filtrar
            </button>
          </form>

          {filas.length === 0 ? (
            <p className="text-texto-suave">No hay productos que coincidan.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filas.map((p) => (
                <li key={p.id}>
                  <Link href={`/crm/productos/editar?id=${p.id}`} className={`flex items-center gap-3 rounded-xl border border-borde bg-superficie p-3 hover:border-marca ${p.activo ? "" : "opacity-60"}`}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{p.nombre}</span>
                      <span className="truncate text-sm text-texto-suave">
                        {p.referencia}
                        {p.categoria ? ` · ${p.categoria}` : ""}
                        {p.activo ? "" : " · oculto"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end text-sm">
                      <span className="font-medium">{euros(p.precio)}</span>
                      <span className={p.stock > 0 ? "text-texto-suave" : "text-error"}>{p.stock > 0 ? `${p.stock} en stock` : "Sin stock"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {paginas > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="Páginas">
              {pagina > 1 ? <Link href={enlace(pagina - 1)} className="rounded-full border border-borde px-4 py-2">‹ Anterior</Link> : <span />}
              <span className="text-texto-suave">
                Página {Math.min(pagina, paginas)} de {paginas}
              </span>
              {pagina < paginas ? <Link href={enlace(pagina + 1)} className="rounded-full border border-borde px-4 py-2">Siguiente ›</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
