import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/campo";
import { cambiarCantidad, tramitar } from "@/features/tienda/acciones-web";
import { faltaParaGratis, subtotal } from "@/features/tienda/calculo";
import { calcularCesta, leerCesta, metodosEnvio } from "@/features/tienda/cesta";
import { euros } from "@/features/tienda/precios";
import { FotoProvisional, Precio } from "@/features/tienda/ui/tarjeta";

export const metadata: Metadata = { title: "Cesta", robots: { index: false, follow: false } };

export default async function Cesta({ searchParams }: PageProps<"/tienda/cesta">) {
  const { aviso } = await searchParams;
  const [{ lineas, avisos }, metodos] = await Promise.all([leerCesta().then(calcularCesta), metodosEnvio()]);
  const sub = subtotal(lineas.map((l) => ({ precio: l.precio.precio, cantidad: l.cantidad, tipoIva: l.tipoIva })));
  const domicilio = metodos.find((m) => m.tipo === "envio");
  const falta = domicilio ? faltaParaGratis(domicilio, sub) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <h1 className="text-2xl font-semibold text-marca">Tu cesta</h1>
      {aviso === "anadido" && avisos.length === 0 && <Aviso tipo="ok">Añadido a la cesta.</Aviso>}
      {aviso === "agotado" && <Aviso>Ese producto se acaba de agotar.</Aviso>}
      {aviso === "ajustada" && <Aviso>Algunos productos se han agotado o quedan menos unidades: hemos ajustado tu cesta. Revísala y vuelve a pulsar «Tramitar pedido».</Aviso>}
      {avisos.map((a) => (
        <Aviso key={a}>{a}</Aviso>
      ))}

      {lineas.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-borde p-8 text-center">
          <p className="text-texto-suave">Tu cesta está vacía.</p>
          <Link href="/tienda" className="flex h-12 items-center rounded-full bg-marca px-6 font-medium text-sobre-marca">
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {lineas.map((l) => (
              <li key={l.productoId} className="flex gap-3 rounded-xl border border-borde bg-superficie p-3">
                <Link href={`/tienda/${l.slug}`} className="w-20 shrink-0">
                  <FotoProvisional nombre={l.nombre} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link href={`/tienda/${l.slug}`} className="line-clamp-2 font-medium hover:underline">
                    {l.nombre}
                  </Link>
                  <Precio p={l.precio} />
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={cambiarCantidad} className="flex items-center gap-2">
                      <input type="hidden" name="productoId" value={l.productoId} />
                      <label className="sr-only" htmlFor={`c-${l.productoId}`}>
                        Cantidad
                      </label>
                      <select id={`c-${l.productoId}`} name="cantidad" defaultValue={l.cantidad} className="h-11 rounded-lg border border-borde bg-fondo px-2 text-base">
                        {Array.from({ length: Math.min(l.stock, 99) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="h-11 rounded-full border border-borde px-3 text-sm">
                        Cambiar
                      </button>
                    </form>
                    <form action={cambiarCantidad}>
                      <input type="hidden" name="productoId" value={l.productoId} />
                      <input type="hidden" name="cantidad" value="0" />
                      <button type="submit" className="h-11 px-2 text-sm text-texto-suave underline underline-offset-4">
                        Quitar
                      </button>
                    </form>
                  </div>
                </div>
                <span className="shrink-0 font-medium">{euros(l.precio.precio * l.cantidad)}</span>
              </li>
            ))}
          </ul>

          <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Productos</span>
              <span>{euros(sub)}</span>
            </div>
            <p className="text-sm text-texto-suave">
              IVA incluido. Los gastos de envío se calculan en el siguiente paso
              {metodos.some((m) => m.tipo === "recogida") ? " (la recogida en el estudio es gratis)" : ""}.
            </p>
            {falta !== null && (
              <p className="rounded-lg bg-fondo-alterno px-3 py-2 text-sm">
                Te faltan <strong>{euros(falta)}</strong> para el envío gratis a domicilio.
              </p>
            )}
            <form action={tramitar}>
              <button type="submit" className="h-12 w-full rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover">
                Tramitar pedido
              </button>
            </form>
            <Link href="/tienda" className="text-center text-sm underline underline-offset-4">
              Seguir comprando
            </Link>
          </section>
        </>
      )}
    </main>
  );
}
