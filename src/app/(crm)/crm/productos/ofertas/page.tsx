import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Campo, Selector } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonConfirmar } from "@/app/(crm)/crm/equipo/editar/confirmar";
import { crearOferta, terminarOferta } from "@/features/tienda/acciones";
import { arbolCategorias, listarOfertas } from "@/features/tienda/consultas";
import { euros } from "@/features/tienda/precios";
import { fechaMadrid, sumarDias } from "@/features/reservas/tiempo";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ofertas" };

const formato = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function Ofertas({ searchParams }: PageProps<"/crm/productos/ofertas">) {
  await exigirEquipo("productos.gestionar");
  const { aviso } = await searchParams;
  const [ofertas, { raices }] = await Promise.all([listarOfertas(), arbolCategorias()]);
  const ahora = new Date();
  const hoy = fechaMadrid(ahora);
  const grupos = {
    "En marcha": ofertas.filter((o) => o.inicio <= ahora && o.fin > ahora),
    Programadas: ofertas.filter((o) => o.inicio > ahora),
    Terminadas: ofertas.filter((o) => o.fin <= ahora).slice(0, 10),
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/productos" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Productos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Ofertas</h1>
        <p className="text-sm text-texto-suave">
          Se aplican solas entre las fechas que pongas. Si a un producto le tocan varias, se queda con la más barata.
        </p>
      </div>
      {aviso === "creada" && <Aviso tipo="ok">Oferta creada.</Aviso>}
      {aviso === "terminada" && <Aviso tipo="ok">Oferta terminada.</Aviso>}

      {Object.entries(grupos).map(([titulo, lista]) => (
        <section key={titulo} className="flex flex-col gap-2">
          <h2 className="font-medium">{titulo}</h2>
          {lista.length === 0 ? (
            <p className="text-sm text-texto-suave">Ninguna.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lista.map((o) => (
                <li key={o.id} className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-3 sm:flex-row sm:items-center">
                  <span className="flex min-w-0 flex-1 flex-col text-sm">
                    <span className="font-medium">
                      {o.nombre} · {o.tipo === "porcentaje" ? `-${o.valor} %` : `-${euros(o.valor)}`}
                    </span>
                    <span className="text-texto-suave">
                      {o.producto ? `${o.producto} (${o.referencia})` : `Categoría ${o.categoria ?? "?"}`}
                    </span>
                    <span className="text-texto-suave">
                      {formato.format(o.inicio)} → {formato.format(o.fin)}
                    </span>
                  </span>
                  {titulo !== "Terminadas" && (
                    <form action={terminarOferta}>
                      <input type="hidden" name="id" value={o.id} />
                      <BotonConfirmar pregunta={`¿Terminar ya la oferta «${o.nombre}»?`}>{titulo === "Programadas" ? "Anular" : "Terminar ya"}</BotonConfirmar>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
        <h2 className="font-medium">Nueva oferta</h2>
        <FormularioAccion accion={crearOferta} boton="Crear oferta">
          <Campo etiqueta="Nombre (lo ve la clienta)" name="nombre" required maxLength={120} placeholder="Black Friday" />
          <Selector etiqueta="Aplica a" name="aplica" defaultValue="categoria">
            <option value="categoria">Una categoría (y sus subcategorías)</option>
            <option value="producto">Un producto</option>
          </Selector>
          <Selector etiqueta="Categoría (si aplica a una categoría)" name="categoriaId" defaultValue="">
            <option value="">—</option>
            {raices.map((r) => [
              <option key={r.id} value={r.id}>
                {r.nombre} (todo el grupo)
              </option>,
              ...r.hijas.map((h) => (
                <option key={h.id} value={h.id}>
                  {r.nombre} › {h.nombre}
                </option>
              )),
            ])}
          </Selector>
          <Campo etiqueta="Referencia (si aplica a un producto)" name="referencia" maxLength={40} placeholder="1D5071" />
          <div className="grid grid-cols-2 gap-4">
            <Selector etiqueta="Descuento" name="tipo" defaultValue="porcentaje">
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="importe">Importe (€)</option>
            </Selector>
            <Campo etiqueta="Cuánto" name="valor" inputMode="decimal" required placeholder="15" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Desde" name="desde" type="datetime-local" defaultValue={`${hoy}T00:00`} required />
            <Campo etiqueta="Hasta" name="hasta" type="datetime-local" defaultValue={`${sumarDias(hoy, 7)}T23:59`} required />
          </div>
        </FormularioAccion>
      </section>
    </main>
  );
}
