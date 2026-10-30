import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Aviso } from "@/components/ui/campo";
import { proveedoresDisponibles } from "@/features/pagos/proveedores";
import { costeEnvio, subtotal } from "@/features/tienda/calculo";
import { calcularCesta, leerCesta, metodosEnvio } from "@/features/tienda/cesta";
import { euros } from "@/features/tienda/precios";
import { FormularioFinalizar } from "./formulario";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false, follow: false } };

export default async function Finalizar() {
  await connection();
  const [{ lineas, cambio }, metodos] = await Promise.all([leerCesta().then(calcularCesta), metodosEnvio()]);
  if (!lineas.length || cambio) redirect("/tienda/cesta");
  const sub = subtotal(lineas.map((l) => ({ precio: l.precio.precio, cantidad: l.cantidad, tipoIva: l.tipoIva })));
  const pagos = proveedoresDisponibles().map((p) => ({ id: p.id, nombre: p.nombre }));
  const totales: Record<string, string> = { productos: euros(sub) };
  const opciones = metodos.map((m) => {
    const coste = costeEnvio(m, sub);
    totales[m.id] = euros(sub + coste);
    return { id: m.id, nombre: m.nombre, tipo: m.tipo, descripcion: m.descripcion, coste: coste === 0 ? "Gratis" : euros(coste) };
  });

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      <div>
        <Link href="/tienda/cesta" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Cesta
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Finalizar pedido</h1>
        <p className="text-sm text-texto-suave">
          {lineas.reduce((n, l) => n + l.cantidad, 0)} artículos · {euros(sub)}
        </p>
      </div>
      {pagos.some((p) => p.id === "prueba") && (
        <Aviso>Web en pruebas: el pago es simulado y no se cobra nada.</Aviso>
      )}
      {pagos.length === 0 || opciones.length === 0 ? (
        <Aviso>Ahora mismo no se pueden hacer pedidos online. Llámanos o escríbenos por WhatsApp.</Aviso>
      ) : (
        <FormularioFinalizar metodos={opciones} pagos={pagos} totales={totales} />
      )}
    </main>
  );
}
