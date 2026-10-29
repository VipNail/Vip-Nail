import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaTexto, Campo, Casilla, Selector } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { TIPOS_IVA } from "@/db/schema";
import { guardarProducto } from "@/features/tienda/acciones";
import { arbolCategorias, listarMarcas, obtenerProducto } from "@/features/tienda/consultas";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Producto" };

const aTexto = (c: number) => (c / 100).toFixed(2).replace(".", ",");

// Sin ?id= es un producto nuevo.
export default async function EditarProducto({ searchParams }: PageProps<"/crm/productos/editar">) {
  await exigirEquipo("productos.gestionar");
  const { id } = await searchParams;
  const p = typeof id === "string" ? await obtenerProducto(id) : null;
  if (typeof id === "string" && !p) notFound();
  const [{ raices }, marcas] = await Promise.all([arbolCategorias(), listarMarcas()]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/productos" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Productos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">{p ? p.nombre : "Nuevo producto"}</h1>
        {p && p.activo && (
          <Link href={`/tienda/${p.slug}`} className="text-sm underline underline-offset-4">
            Ver en la tienda
          </Link>
        )}
      </div>

      <FormularioAccion accion={guardarProducto} cancelar="/crm/productos">
        {p && <input type="hidden" name="id" value={p.id} />}
        <Campo etiqueta="Nombre" name="nombre" defaultValue={p?.nombre} required maxLength={200} />
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Referencia" name="referencia" defaultValue={p?.referencia} required maxLength={40} placeholder="1D5071" />
          <Campo etiqueta="Código de barras" name="ean" defaultValue={p?.ean ?? ""} inputMode="numeric" maxLength={20} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Precio (€, IVA incl.)" name="precio" inputMode="decimal" defaultValue={p ? aTexto(p.precio) : ""} required placeholder="12,95" />
          <Selector etiqueta="IVA" name="tipoIva" defaultValue={String(p?.tipoIva ?? 21)}>
            {TIPOS_IVA.map((t) => (
              <option key={t} value={t}>
                {t} %
              </option>
            ))}
          </Selector>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Stock (unidades)" name="stock" type="number" inputMode="numeric" defaultValue={p?.stock ?? 0} required />
          <Campo etiqueta="Peso (g, para envíos)" name="pesoG" inputMode="numeric" defaultValue={p?.pesoG ?? ""} />
        </div>
        <Selector etiqueta="Categoría" name="categoriaId" defaultValue={p?.categoriaId ?? ""}>
          <option value="">Sin categoría</option>
          {raices.map((r) => [
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>,
            ...r.hijas.map((h) => (
              <option key={h.id} value={h.id}>
                {r.nombre} › {h.nombre}
              </option>
            )),
          ])}
        </Selector>
        <Selector etiqueta="Marca" name="marcaId" defaultValue={p?.marcaId ?? ""}>
          <option value="">Sin marca</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </Selector>
        <AreaTexto etiqueta="Descripción" name="descripcion" defaultValue={p?.descripcion ?? ""} maxLength={10000} rows={6} />
        <Casilla name="activo" defaultChecked={p ? p.activo : true} etiqueta="A la venta en la tienda" />
        <Casilla name="destacado" defaultChecked={p?.destacado ?? false} etiqueta="Destacado (sale primero en la portada)" />
        <p className="text-sm text-texto-suave">Las fotos llegarán con la subida de imágenes; de momento se muestra una imagen provisional.</p>
      </FormularioAccion>
    </main>
  );
}
