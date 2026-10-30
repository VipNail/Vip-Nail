import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Campo, Selector } from "@/components/ui/campo";
import { EnlaceConfirmar } from "@/components/ui/enlace-confirmar";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { apuntarAlumna, cambiarEstadoConvocatoria, cambiarPlaza } from "@/features/academia/acciones";
import { obtenerConvocatoria, plazasDe, TEXTO_PLAZA } from "@/features/academia/consultas";
import { ocupa } from "@/features/academia/logica";
import { euros } from "@/features/tienda/precios";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Alumnas del curso" };

const AVISOS: Record<string, string> = {
  apuntada: "Alumna apuntada.",
  plaza: "Plaza actualizada.",
  abierta: "Inscripción abierta en la web.",
  cerrada: "Inscripción cerrada: ya no se puede reservar desde la web.",
  cancelada: "Convocatoria cancelada. Avisa a las alumnas y devuelve lo pagado si procede.",
};
const dia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function Convocatoria({ searchParams }: PageProps<"/crm/cursos/convocatoria">) {
  await exigirEquipo("cursos.gestionar");
  const sp = await searchParams;
  const r = typeof sp.id === "string" ? await obtenerConvocatoria(sp.id) : null;
  if (!r) notFound();
  const { c, curso } = r;
  const ahora = new Date();
  const plazas = (await plazasDe(c.id)).filter((p) => ocupa(p, ahora) || p.estado !== "reservada_pendiente");
  const ocupadas = plazas.filter((p) => ocupa(p, ahora)).length;
  const libres = Math.max(0, c.plazas - ocupadas);
  const cobrado = plazas.reduce((t, p) => t + (p.estado === "reservada_pendiente" ? 0 : p.importePagado), 0);
  const pendiente = plazas.reduce((t, p) => t + (p.estado === "senal_pagada" ? curso.precio - p.importePagado : 0), 0);
  const mensaje = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href={`/crm/cursos/ver?id=${curso.id}#fechas`} className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← {curso.titulo}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca first-letter:uppercase">{dia.format(c.inicio)}</h1>
        <p className="text-sm text-texto-suave">{[c.horario, c.lugar].filter(Boolean).join(" · ")}</p>
      </div>
      {mensaje && <Aviso tipo={sp.aviso === "cancelada" ? "error" : "ok"}>{mensaje}</Aviso>}

      <div className="grid grid-cols-3 gap-3 text-center">
        <Dato titulo="Plazas libres" valor={`${libres} de ${c.plazas}`} />
        <Dato titulo="Cobrado" valor={euros(cobrado)} />
        <Dato titulo="Falta por cobrar" valor={euros(pendiente)} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>
          Inscripción: <strong>{{ abierta: "abierta", cerrada: "cerrada", cancelada: "cancelada" }[c.estado]}</strong>
        </span>
        {(["abierta", "cerrada", "cancelada"] as const)
          .filter((e) => e !== c.estado)
          .map((e) => (
            <form key={e} action={cambiarEstadoConvocatoria}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="estado" value={e} />
              {e === "cancelada" ? (
                <EnlaceConfirmar className="rounded-full border border-error px-3 py-1 text-error" pregunta="¿Cancelar estas fechas? Desaparecen de la web. Tendrás que avisar a las alumnas y devolver lo pagado.">
                  Cancelar convocatoria
                </EnlaceConfirmar>
              ) : (
                <button type="submit" className="rounded-full border border-borde px-3 py-1">
                  {{ abierta: "Abrir", cerrada: "Cerrar" }[e]}
                </button>
              )}
            </form>
          ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Alumnas ({plazas.length})</h2>
        {!plazas.length && <p className="text-sm text-texto-suave">Aún no hay nadie apuntado.</p>}
        <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
          {plazas.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/crm/clientas/ficha?id=${p.clienteId}`} className="flex min-w-0 flex-col">
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-texto-suave">{[p.telefono, p.email].filter(Boolean).join(" · ")}</span>
              </Link>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full border px-2 py-0.5 text-xs ${TEXTO_PLAZA[p.estado].clase}`}>{TEXTO_PLAZA[p.estado].texto}</span>
                {p.estado !== "reservada_pendiente" && <span>{euros(p.importePagado)}</span>}
                {p.pedidoId && (
                  <Link href={`/crm/pedidos/ver?id=${p.pedidoId}`} className="underline underline-offset-4">
                    Pedido
                  </Link>
                )}
                {p.estado === "senal_pagada" && (
                  <form action={cambiarPlaza}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="accion" value="resto" />
                    <button type="submit" className="rounded-full bg-marca px-3 py-1 text-sobre-marca">
                      Cobrado el resto ({euros(curso.precio - p.importePagado)})
                    </button>
                  </form>
                )}
                <form action={cambiarPlaza}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="accion" value="cancelar" />
                  <EnlaceConfirmar
                    className="text-error underline underline-offset-4"
                    pregunta={`¿Cancelar la plaza de ${p.nombre}? Queda libre para otra alumna.${p.importePagado && p.estado !== "reservada_pendiente" ? ` Ha pagado ${euros(p.importePagado)}: la devolución se hace aparte.` : ""}`}
                  >
                    Cancelar plaza
                  </EnlaceConfirmar>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {libres > 0 && c.estado !== "cancelada" && (
        <section className="rounded-xl border border-borde p-4">
          <h2 className="mb-3 font-medium">Apuntar a una alumna desde el estudio</h2>
          <FormularioAccion accion={apuntarAlumna} boton="Apuntar">
            <input type="hidden" name="convocatoriaId" value={c.id} />
            <Campo etiqueta="Nombre y apellidos" name="nombre" required maxLength={160} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" maxLength={32} />
              <Campo etiqueta="Email" name="email" type="email" maxLength={191} />
            </div>
            <Selector etiqueta="Qué ha pagado" name="pago" defaultValue="pagada">
              <option value="pagada">Curso completo ({euros(curso.precio)})</option>
              {c.precioSenal !== null && <option value="senal_pagada">Solo la señal ({euros(c.precioSenal)})</option>}
            </Selector>
          </FormularioAccion>
        </section>
      )}
    </main>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-borde bg-superficie p-3">
      <div className="text-xs text-texto-suave">{titulo}</div>
      <div className="text-lg font-semibold">{valor}</div>
    </div>
  );
}
