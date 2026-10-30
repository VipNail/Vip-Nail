import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Boton, BotonSecundario } from "@/components/ui/campo";
import { BotonConfirmar } from "@/app/(crm)/crm/equipo/editar/confirmar";
import { cambiarEstadoPedido, guardarNotaPedido } from "@/features/tienda/acciones-pedidos";
import { desgloseIva } from "@/features/tienda/calculo";
import { pedidoCrm, textoEstado } from "@/features/tienda/pedidos";
import { euros } from "@/features/tienda/precios";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Pedido" };

const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" });

const AVISOS: Record<string, { texto: string; ok: boolean }> = {
  preparando: { texto: "Marcado como «preparando».", ok: true },
  enviado: { texto: "Marcado como enviado / listo para recoger.", ok: true },
  cancelado: { texto: "Pedido cancelado.", ok: true },
  reembolsado: { texto: "Pedido devuelto y stock repuesto. Recuerda devolver el dinero desde la pasarela de pago.", ok: true },
  nota: { texto: "Guardado.", ok: true },
  "no-permitido": { texto: "Ese cambio no se puede hacer en el estado actual del pedido.", ok: false },
};

function Cambio({ id, estado, texto, pregunta, secundario = false }: { id: string; estado: string; texto: string; pregunta?: string; secundario?: boolean }) {
  return (
    <form action={cambiarEstadoPedido}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      {pregunta ? (
        <BotonConfirmar pregunta={pregunta}>{texto}</BotonConfirmar>
      ) : secundario ? (
        <BotonSecundario type="submit" className="w-full">{texto}</BotonSecundario>
      ) : (
        <Boton type="submit" className="w-full">{texto}</Boton>
      )}
    </form>
  );
}

export default async function VerPedido({ searchParams }: PageProps<"/crm/pedidos/ver">) {
  await exigirEquipo("pedidos.gestionar");
  const sp = await searchParams;
  const p = typeof sp.id === "string" ? await pedidoCrm(sp.id) : null;
  if (!p) notFound();
  const e = textoEstado(p.estado, p.envioTipo);
  const aviso = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;
  const iva = desgloseIva(p.lineas, p.envio);
  const recogida = p.envioTipo === "recogida";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <div>
        <Link href="/crm/pedidos" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Pedidos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Pedido {p.numero}</h1>
        <p className="text-sm text-texto-suave">
          {fecha.format(p.createdAt)} · <span className={`rounded-full border px-2 ${e.clase}`}>{e.texto}</span>
        </p>
      </div>

      {aviso && <Aviso tipo={aviso.ok ? "ok" : "error"}>{aviso.texto}</Aviso>}
      {p.incidencia && <Aviso>⚠ {p.incidencia}</Aviso>}

      {/* Siguiente paso según el estado */}
      {(p.estado === "pagado" || p.estado === "preparando") && (
        <section className="flex flex-col gap-3 rounded-xl border border-marca p-4">
          <h2 className="font-medium">Siguiente paso</h2>
          {p.estado === "pagado" && <Cambio id={p.id} estado="preparando" texto="Empezar a prepararlo" secundario />}
          <form action={cambiarEstadoPedido} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="estado" value="enviado" />
            {!recogida && (
              <input name="seguimiento" placeholder="Nº de seguimiento (opcional)" maxLength={120} aria-label="Número de seguimiento" className="h-11 rounded-lg border border-borde bg-superficie px-3 text-base" />
            )}
            <Boton type="submit">{recogida ? "Listo para recoger" : "Marcar como enviado"}</Boton>
          </form>
        </section>
      )}

      <section className="grid gap-4 rounded-xl border border-borde bg-superficie p-4 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-1 font-medium">Clienta</h2>
          <p>
            <Link href={`/crm/clientas/ficha?id=${p.clienteId}`} className="underline underline-offset-4">
              {p.nombre}
            </Link>
            <br />
            <a href={`tel:${p.telefono}`} className="underline underline-offset-4">{p.telefono}</a>
            <br />
            <a href={`mailto:${p.email}`} className="break-all underline underline-offset-4">{p.email}</a>
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-medium">{p.envioNombre}</h2>
          {p.direccion ? (
            <p>
              {p.direccion.nombre}
              <br />
              {p.direccion.direccion}
              <br />
              {p.direccion.cp} {p.direccion.ciudad} ({p.direccion.provincia})
            </p>
          ) : (
            <p>Recoge en el estudio.</p>
          )}
          {p.seguimiento && <p className="mt-1">Seguimiento: {p.seguimiento}</p>}
        </div>
        {p.notas && (
          <div className="sm:col-span-2">
            <h2 className="mb-1 font-medium">Notas de la clienta</h2>
            <p className="whitespace-pre-line">{p.notas}</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Productos</h2>
        <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
          {p.lineas.map((l) => (
            <li key={l.id} className="flex gap-3 p-3 text-sm">
              <span className="shrink-0 font-medium">{l.cantidad} ×</span>
              <span className="flex flex-1 flex-col">
                <span>{l.nombre}</span>
                <span className="text-texto-suave">
                  Ref. {l.referencia} · {euros(l.precio)}/ud{l.oferta ? ` · ${l.oferta} (antes ${euros(l.precioOriginal)})` : ""}
                </span>
              </span>
              <span className="shrink-0 font-medium">{euros(l.precio * l.cantidad)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><dt>Productos</dt><dd>{euros(p.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Entrega</dt><dd>{p.envio ? euros(p.envio) : "Gratis"}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{euros(p.total)}</dd></div>
          <dd className="text-xs text-texto-suave">IVA incluido: {iva.map((x) => `${euros(x.cuota)} (${x.tipo} %)`).join(" · ")}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-borde p-4 text-sm">
        <h2 className="mb-1 font-medium">Pago</h2>
        <p>
          {p.pagadoAt ? `Pagado el ${fecha.format(p.pagadoAt)}` : "Sin pagar"} · {p.metodoPago === "prueba" ? "pago de prueba (simulado)" : p.metodoPago ?? "—"}
          {p.refPasarela && <span className="block text-texto-suave">Ref. {p.refPasarela}</span>}
        </p>
        {/* DEBT: estado del envío a Factusol cuando se resuelva P1. */}
      </section>

      <form action={guardarNotaPedido} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={p.id} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Nota interna (no la ve la clienta)</span>
          <textarea name="notaInterna" defaultValue={p.notaInterna ?? ""} maxLength={2000} className="min-h-20 rounded-lg border border-borde bg-superficie px-3 py-2 text-base" />
        </label>
        {p.incidencia && (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="resolverIncidencia" className="size-5" /> Incidencia resuelta
          </label>
        )}
        <BotonSecundario type="submit" className="w-full sm:w-auto sm:self-end">Guardar</BotonSecundario>
      </form>

      {p.estado === "pendiente_pago" && (
        <Cambio id={p.id} estado="cancelado" texto="Cancelar pedido sin pagar" pregunta={`¿Cancelar el pedido ${p.numero}?`} />
      )}
      {(p.estado === "pagado" || p.estado === "preparando") && (
        <Cambio
          id={p.id}
          estado="reembolsado"
          texto="Cancelar y devolver"
          pregunta={`¿Cancelar el pedido ${p.numero}? El stock vuelve a la tienda y tendrás que devolver ${euros(p.total)} desde la pasarela de pago.`}
        />
      )}
    </main>
  );
}
