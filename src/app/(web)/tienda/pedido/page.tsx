// Pedido visto por la clienta (enlace con número y clave secreta, sin cuenta).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Boton } from "@/components/ui/campo";
import { pagarPedido } from "@/features/tienda/acciones-web";
import { desgloseIva } from "@/features/tienda/calculo";
import { pedidoPublico, textoEstado } from "@/features/tienda/pedidos";
import { euros } from "@/features/tienda/precios";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Madrid" });

const AVISOS: Record<string, { texto: string; ok: boolean }> = {
  pagado: { texto: "¡Gracias! Hemos recibido tu pago.", ok: true },
  cancelado: { texto: "El pago no se ha completado. Puedes volver a intentarlo.", ok: false },
  error: { texto: "No hemos podido confirmar el pago. Si te lo han cobrado, escríbenos.", ok: false },
  "sin-pago": { texto: "Ahora mismo no se pueden hacer pagos online. Inténtalo más tarde.", ok: false },
};

export default async function Pedido({ searchParams }: PageProps<"/tienda/pedido">) {
  const sp = await searchParams;
  const n = typeof sp.n === "string" ? sp.n : "";
  const t = typeof sp.t === "string" ? sp.t : "";
  const p = await pedidoPublico(n, t);
  if (!p) notFound();
  const aviso = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;
  const est = textoEstado(p.estado, p.envioTipo);
  const iva = desgloseIva(p.lineas, p.envio);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-marca">Pedido {p.numero}</h1>
        <p className="text-sm text-texto-suave">{fecha.format(p.createdAt)}</p>
      </div>
      {aviso && <Aviso tipo={aviso.ok ? "ok" : "error"}>{aviso.texto}</Aviso>}

      <p>
        Estado: <span className={`rounded-full border px-2 py-0.5 text-sm ${est.clase}`}>{est.texto}</span>
        {p.seguimiento && <span className="block text-sm text-texto-suave">Seguimiento: {p.seguimiento}</span>}
      </p>

      {p.estado === "pendiente_pago" && (
        <form action={pagarPedido}>
          <input type="hidden" name="n" value={p.numero} />
          <input type="hidden" name="t" value={p.tokenAcceso} />
          <Boton type="submit" className="w-full">
            Pagar {euros(p.total)}
          </Boton>
        </form>
      )}

      <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
        {p.lineas.map((l) => (
          <li key={l.id} className="flex gap-3 p-3 text-sm">
            <span className="shrink-0">{l.cantidad} ×</span>
            <span className="flex-1">
              {l.nombre}
              {l.oferta && <span className="block text-xs text-error">{l.oferta}</span>}
            </span>
            <span className="shrink-0 font-medium">{euros(l.precio * l.cantidad)}</span>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Productos</dt>
          <dd>{euros(p.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{p.envioNombre}</dt>
          <dd>{p.envio ? euros(p.envio) : "Gratis"}</dd>
        </div>
        <div className="flex justify-between text-lg font-semibold">
          <dt>Total</dt>
          <dd>{euros(p.total)}</dd>
        </div>
        <dd className="text-xs text-texto-suave">
          IVA incluido: {iva.map((x) => `${euros(x.cuota)} (${x.tipo} %)`).join(" · ")}
        </dd>
      </dl>

      <section className="rounded-xl border border-borde p-4 text-sm">
        <h2 className="mb-1 font-medium">Entrega</h2>
        {p.direccion ? (
          <p>
            {p.direccion.nombre}
            <br />
            {p.direccion.direccion}
            <br />
            {p.direccion.cp} {p.direccion.ciudad} ({p.direccion.provincia})
          </p>
        ) : (
          <p>Recogida en el estudio. Te avisaremos cuando esté listo.</p>
        )}
      </section>

      <p className="text-sm text-texto-suave">
        Guarda este enlace para consultar tu pedido. ¿Dudas? Escríbenos indicando el número {p.numero}.
      </p>
      <Link href="/tienda" className="text-center text-sm underline underline-offset-4">
        Volver a la tienda
      </Link>
    </main>
  );
}
