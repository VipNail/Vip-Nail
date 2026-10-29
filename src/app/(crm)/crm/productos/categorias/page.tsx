import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, BotonSecundario } from "@/components/ui/campo";
import { BotonConfirmar } from "@/app/(crm)/crm/equipo/editar/confirmar";
import { borrarCategoria, borrarMarca, guardarCategoria, guardarMarca } from "@/features/tienda/acciones";
import { arbolCategorias, listarMarcas, recuentos, type NodoCategoria } from "@/features/tienda/consultas";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Categorías y marcas" };

const AVISOS: Record<string, { texto: string; ok: boolean }> = {
  guardada: { texto: "Guardado.", ok: true },
  borrada: { texto: "Borrado.", ok: true },
  nombre: { texto: "El nombre es demasiado corto.", ok: false },
  nivel: { texto: "Solo hay dos niveles: grupo y subcategoría. Una subcategoría no puede tener otras dentro.", ok: false },
  ocupada: { texto: "No se puede borrar: tiene productos o subcategorías. Muévelos antes.", ok: false },
};

const entrada = "h-11 rounded-lg border border-borde bg-superficie px-2 text-base";

export default async function Categorias({ searchParams }: PageProps<"/crm/productos/categorias">) {
  await exigirEquipo("productos.gestionar");
  const { aviso } = await searchParams;
  const [{ raices }, marcas, n] = await Promise.all([arbolCategorias(), listarMarcas(), recuentos()]);
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;

  function Fila({ c, esHija }: { c: NodoCategoria | NodoCategoria["hijas"][number]; esHija: boolean }) {
    const productos = n.categoria.get(c.id) ?? 0;
    const hijas = "hijas" in c ? c.hijas.length : 0;
    return (
      <details className={`rounded-lg border border-borde bg-superficie ${esHija ? "ml-4" : ""}`}>
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2">
          <span className={`flex-1 ${esHija ? "" : "font-medium"}`}>{c.nombre}</span>
          {!c.visible && <span className="rounded-full border border-borde px-2 text-xs text-texto-suave">oculta</span>}
          <span className="text-sm text-texto-suave">{productos} prod.</span>
        </summary>
        <div className="flex flex-col gap-3 border-t border-borde p-3">
          <form action={guardarCategoria} className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input type="hidden" name="id" value={c.id} />
            <input name="nombre" defaultValue={c.nombre} required maxLength={120} aria-label="Nombre" className={entrada} />
            <input name="orden" type="number" defaultValue={c.orden} aria-label="Orden" className={`${entrada} w-20`} />
            <select name="parentId" defaultValue={c.parentId ?? ""} aria-label="Dentro de" className={entrada}>
              <option value="">Grupo principal</option>
              {raices
                .filter((r) => r.id !== c.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Dentro de {r.nombre}
                  </option>
                ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="visible" defaultChecked={c.visible} className="size-5" /> Visible en la tienda
            </label>
            <BotonSecundario type="submit" className="h-11 sm:col-start-3">
              Guardar
            </BotonSecundario>
          </form>
          {productos === 0 && hijas === 0 && (
            <form action={borrarCategoria}>
              <input type="hidden" name="id" value={c.id} />
              <BotonConfirmar pregunta={`¿Borrar la categoría «${c.nombre}»?`}>Borrar</BotonConfirmar>
            </form>
          )}
        </div>
      </details>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/productos" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Productos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Categorías y marcas</h1>
        <p className="text-sm text-texto-suave">Dos niveles: grupo (por ejemplo «Molekula») y subcategoría («Esmaltes»). Pulsa en una para editarla.</p>
      </div>

      {mensaje && <Aviso tipo={mensaje.ok ? "ok" : "error"}>{mensaje.texto}</Aviso>}

      <section className="flex flex-col gap-2">
        {raices.length === 0 && <p className="text-sm text-texto-suave">Todavía no hay categorías.</p>}
        {raices.map((r) => (
          <div key={r.id} className="flex flex-col gap-2">
            <Fila c={r} esHija={false} />
            {r.hijas.map((h) => (
              <Fila key={h.id} c={h} esHija />
            ))}
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
        <h2 className="font-medium">Nueva categoría</h2>
        <form action={guardarCategoria} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input name="nombre" required maxLength={120} placeholder="Nombre" aria-label="Nombre" className={entrada} />
          <select name="parentId" defaultValue="" aria-label="Dentro de" className={entrada}>
            <option value="">Grupo principal</option>
            {raices.map((r) => (
              <option key={r.id} value={r.id}>
                Dentro de {r.nombre}
              </option>
            ))}
          </select>
          <input type="hidden" name="visible" value="on" />
          <input type="hidden" name="orden" value="99" />
          <BotonSecundario type="submit" className="h-11 sm:col-span-2">
            Añadir categoría
          </BotonSecundario>
        </form>
      </section>

      <section id="marcas" className="flex flex-col gap-3 rounded-xl border border-borde p-4">
        <h2 className="font-medium">Marcas</h2>
        <ul className="flex flex-col gap-2">
          {marcas.map((m) => {
            const productos = n.marca.get(m.id) ?? 0;
            return (
              <li key={m.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <form action={guardarMarca} className="flex flex-1 gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <input name="nombre" defaultValue={m.nombre} required maxLength={120} aria-label="Marca" className={`${entrada} min-w-0 flex-1`} />
                  <span className="self-center text-sm text-texto-suave">{productos} prod.</span>
                  <BotonSecundario type="submit" className="h-11 px-4">
                    Guardar
                  </BotonSecundario>
                </form>
                {productos === 0 && (
                  <form action={borrarMarca}>
                    <input type="hidden" name="id" value={m.id} />
                    <BotonConfirmar pregunta={`¿Borrar la marca «${m.nombre}»?`}>Borrar</BotonConfirmar>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
        <form action={guardarMarca} className="flex gap-2">
          <input name="nombre" required maxLength={120} placeholder="Nueva marca" aria-label="Nueva marca" className={`${entrada} min-w-0 flex-1`} />
          <BotonSecundario type="submit" className="h-11 px-4">
            Añadir
          </BotonSecundario>
        </form>
      </section>
    </main>
  );
}
