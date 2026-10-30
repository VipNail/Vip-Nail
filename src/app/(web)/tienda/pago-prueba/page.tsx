// Pasarela SIMULADA (solo fuera de producción). Imita a Redsys: muestra el importe y envía un
// aviso firmado en el servidor. La firma no se puede falsificar desde el navegador.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { firmarPrueba, pagosDePrueba } from "@/features/pagos/proveedores";
import { pedidoPublico } from "@/features/tienda/pedidos";
import { euros } from "@/features/tienda/precios";

export const metadata: Metadata = { title: "Pago de prueba", robots: { index: false, follow: false } };

export default async function PagoPrueba({ searchParams }: PageProps<"/tienda/pago-prueba">) {
  if (!pagosDePrueba()) notFound();
  const sp = await searchParams;
  const p = await pedidoPublico(typeof sp.n === "string" ? sp.n : "", typeof sp.t === "string" ? sp.t : "");
  if (!p || p.estado !== "pendiente_pago") notFound();

  const boton = (resultado: "ok" | "ko", texto: string, principal: boolean) => (
    <form action="/api/pagos/prueba" method="post">
      <input type="hidden" name="pedido" value={p.id} />
      <input type="hidden" name="importe" value={p.total} />
      <input type="hidden" name="resultado" value={resultado} />
      <input type="hidden" name="firma" value={firmarPrueba(p.id, p.total, resultado)} />
      <button
        type="submit"
        className={`h-12 w-full rounded-full px-6 font-medium ${principal ? "bg-marca text-sobre-marca" : "border border-borde"}`}
      >
        {texto}
      </button>
    </form>
  );

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-5 px-4 py-10 text-center">
      <p className="rounded-lg border border-acento px-3 py-2 text-sm">Pasarela de PRUEBA: no se cobra nada.</p>
      <h1 className="text-xl font-semibold">Pedido {p.numero}</h1>
      <p className="text-3xl font-semibold">{euros(p.total)}</p>
      {boton("ok", "Simular pago correcto", true)}
      {boton("ko", "Simular pago rechazado", false)}
    </main>
  );
}
