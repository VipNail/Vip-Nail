import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/ui/campo";
import { BotonConfirmar } from "@/app/(crm)/crm/equipo/editar/confirmar";
import { academiaDeClienta, TEXTO_PLAZA } from "@/features/academia/consultas";
import { EnlaceAlumna } from "./enlace-alumna";
import { ESTADO_CITA } from "@/features/agenda/estados";
import { borrarClienta, fusionarClientas } from "@/features/clientas/acciones";
import { buscarParaFusion, fichaClienta } from "@/features/clientas/consultas";
import { pedidosDeClienta, textoEstado } from "@/features/tienda/pedidos";
import { euros } from "@/features/tienda/precios";
import { horaMadrid } from "@/features/reservas/tiempo";
import { tienePermiso } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Clienta" };

const dia = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
const soloFecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

const AVISOS: Record<string, { texto: string; ok: boolean }> = {
  guardada: { texto: "Ficha guardada.", ok: true },
  cita: { texto: "Cita apuntada.", ok: true },
  fusionada: { texto: "Fichas fusionadas: todo está ahora en esta.", ok: true },
  "no-fusion": { texto: "No se pudo fusionar: alguna de las fichas ya no existe.", ok: false },
  "dos-cuentas": { texto: "Las dos fichas tienen cuenta en la web: no se pueden unir automáticamente.", ok: false },
  pendientes: { texto: "Tiene citas pendientes. Cancélalas antes de borrar la ficha.", ok: false },
  "pedidos-abiertos": { texto: "Tiene pedidos pagados sin entregar. Termínalos antes de borrar la ficha.", ok: false },
};

export default async function Ficha({ searchParams }: PageProps<"/crm/clientas/ficha">) {
  const yo = await exigirEquipo("clientas.ver");
  const gestiona = tienePermiso(yo.rol, "clientas.gestionar");
  const rgpd = tienePermiso(yo.rol, "clientas.rgpd");
  const citasGestion = tienePermiso(yo.rol, "agenda.gestionar");
  const verPedidos = tienePermiso(yo.rol, "pedidos.gestionar");
  const sp = await searchParams;
  const f = typeof sp.id === "string" ? await fichaClienta(sp.id) : null;
  if (!f || f.clienta.borradaAt) notFound();
  const { clienta: c, citas, proximas, resumen } = f;
  const verCursos = tienePermiso(yo.rol, "cursos.gestionar");
  const [pedidos, academia] = await Promise.all([verPedidos ? pedidosDeClienta(c.id) : Promise.resolve([]), academiaDeClienta(c.id)]);
  const aviso = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;

  const fusionar = gestiona && sp.fusionar === "1";
  const qFusion = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const candidatas = fusionar && qFusion ? await buscarParaFusion(c.id, qFusion) : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/crm/clientas" className="text-sm text-texto-suave underline-offset-4 hover:underline">
            ← Clientas
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-marca">{c.nombre}</h1>
          <p className="text-sm text-texto-suave">
            Clienta desde {soloFecha.format(c.createdAt)}
            {c.origen === "web" ? " · alta en la web" : c.origen === "migracion" ? " · web antigua" : ""}
          </p>
        </div>
        {gestiona && (
          <Link href={`/crm/clientas/editar?id=${c.id}`} className="flex h-11 items-center rounded-full border border-marca px-5 font-medium text-marca">
            Editar
          </Link>
        )}
      </div>

      {aviso && <Aviso tipo={aviso.ok ? "ok" : "error"}>{aviso.texto}</Aviso>}

      <section className="grid gap-3 rounded-xl border border-borde bg-superficie p-4 text-sm sm:grid-cols-2">
        <Dato titulo="Teléfono">{c.telefono ? <a href={`tel:${c.telefono}`} className="underline underline-offset-4">{c.telefono}</a> : "—"}</Dato>
        <Dato titulo="Email">{c.email ? <a href={`mailto:${c.email}`} className="break-all underline underline-offset-4">{c.email}</a> : "—"}</Dato>
        <Dato titulo="Promociones">
          {c.consentimientoMarketing ? `Sí, desde el ${soloFecha.format(c.consentimientoMarketingAt ?? c.createdAt)}` : "No"}
        </Dato>
        <Dato titulo="Etiquetas">
          {c.etiquetas?.length ? (
            <span className="flex flex-wrap gap-1">
              {c.etiquetas.map((e) => (
                <Link key={e} href={`/crm/clientas?etiqueta=${encodeURIComponent(e)}`} className="rounded-full border border-borde px-2">
                  {e}
                </Link>
              ))}
            </span>
          ) : (
            "—"
          )}
        </Dato>
        {c.notas && (
          <div className="sm:col-span-2">
            <Dato titulo="Notas">
              <span className="whitespace-pre-line">{c.notas}</span>
            </Dato>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cifra numero={resumen.hechas} texto="hechas" />
        <Cifra numero={proximas.length} texto="próximas" />
        <Cifra numero={resumen.noVino} texto="no vino" alerta={resumen.noVino > 0} />
        <Cifra numero={resumen.canceladas} texto="canceladas" />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Citas</h2>
          {citasGestion && (
            <Link href={`/crm/agenda/nueva?clienta=${c.id}`} className="flex h-11 items-center rounded-full bg-marca px-5 text-sm font-medium text-sobre-marca">
              Nueva cita
            </Link>
          )}
        </div>
        {citas.length === 0 ? (
          <p className="text-sm text-texto-suave">Todavía no tiene citas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {citas.map((x) => (
              <li key={x.id}>
                <Link href={`/crm/agenda/cita?id=${x.id}`} className="flex items-center gap-3 rounded-lg border border-borde bg-superficie px-3 py-2 hover:border-marca">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium first-letter:uppercase">
                      {dia.format(x.inicio)} · {horaMadrid(x.inicio)}
                    </span>
                    <span className="truncate text-sm text-texto-suave">
                      {x.servicio} · {x.persona}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full border px-2 text-xs ${ESTADO_CITA[x.estado].clase}`}>{ESTADO_CITA[x.estado].texto}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {verPedidos && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Pedidos de la tienda</h2>
          {pedidos.length === 0 ? (
            <p className="text-sm text-texto-suave">Todavía no ha comprado en la tienda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pedidos.map((p) => {
                const e = textoEstado(p.estado, p.envioTipo);
                return (
                  <li key={p.id}>
                    <Link href={`/crm/pedidos/ver?id=${p.id}`} className="flex items-center gap-3 rounded-lg border border-borde bg-superficie px-3 py-2 hover:border-marca">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium">{p.numero}</span>
                        <span className="text-sm text-texto-suave">{dia.format(p.createdAt)}</span>
                      </span>
                      <span className="font-medium">{euros(p.total)}</span>
                      <span className={`shrink-0 rounded-full border px-2 text-xs ${e.clase}`}>{e.texto}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {(academia.accesos.length > 0 || academia.plazas.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Cursos</h2>
          <ul className="flex flex-col gap-2">
            {academia.plazas.map((p) => (
              <li key={p.id}>
                <Link href={verCursos ? `/crm/cursos/convocatoria?id=${p.convocatoriaId}` : "#"} className="flex items-center gap-3 rounded-lg border border-borde bg-superficie px-3 py-2 hover:border-marca">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{p.titulo}</span>
                    <span className="text-sm text-texto-suave">Presencial · {dia.format(p.inicio)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full border px-2 text-xs ${TEXTO_PLAZA[p.estado].clase}`}>{TEXTO_PLAZA[p.estado].texto}</span>
                </Link>
              </li>
            ))}
            {academia.accesos.map((a) => (
              <li key={a.id}>
                <Link href={verCursos ? `/crm/cursos/ver?id=${a.cursoId}#alumnas` : "#"} className="flex items-center gap-3 rounded-lg border border-borde bg-superficie px-3 py-2 hover:border-marca">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{a.titulo}</span>
                    <span className="text-sm text-texto-suave">Online · desde {dia.format(a.desde)}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-marca px-2 text-xs text-marca">Con acceso</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {gestiona && (
        <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
          <h2 className="font-medium">¿Está repetida?</h2>
          {!fusionar ? (
            <>
              <p className="text-sm text-texto-suave">
                Si esta clienta tiene otra ficha (por ejemplo, con otro teléfono), puedes unirlas: todo pasa a esta ficha.
              </p>
              <Link href={`/crm/clientas/ficha?id=${c.id}&fusionar=1`} className="text-sm font-medium text-marca underline underline-offset-4">
                Buscar la otra ficha
              </Link>
            </>
          ) : (
            <>
              <form className="flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="fusionar" value="1" />
                <input
                  type="search"
                  name="q"
                  defaultValue={qFusion}
                  placeholder="Nombre, teléfono o email de la otra ficha"
                  aria-label="Buscar la otra ficha"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-3 text-base"
                />
                <button type="submit" className="h-11 rounded-full bg-marca px-4 text-sm font-medium text-sobre-marca">
                  Buscar
                </button>
              </form>
              {qFusion && candidatas.length === 0 && <p className="text-sm text-texto-suave">No hay otra ficha que coincida.</p>}
              <ul className="flex flex-col gap-2">
                {candidatas.map((o) => (
                  <li key={o.id} className="flex flex-col gap-2 rounded-lg border border-borde p-3 sm:flex-row sm:items-center">
                    <span className="flex min-w-0 flex-1 flex-col text-sm">
                      <span className="font-medium">{o.nombre}</span>
                      <span className="text-texto-suave">
                        {[o.telefono, o.email].filter(Boolean).join(" · ") || "Sin contacto"} · {o.citas} citas
                      </span>
                    </span>
                    <form action={fusionarClientas}>
                      <input type="hidden" name="principal" value={c.id} />
                      <input type="hidden" name="duplicada" value={o.id} />
                      <BotonConfirmar pregunta={`¿Unir «${o.nombre}» dentro de «${c.nombre}»? La ficha «${o.nombre}» desaparece y sus citas pasan a esta. No se puede deshacer.`}>
                        Unir aquí
                      </BotonConfirmar>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {(gestiona || verCursos) && (
        <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
          <h2 className="font-medium">Zona de alumna</h2>
          <p className="text-sm text-texto-suave">
            {c.userId
              ? `Tiene cuenta: entra en vipnail.es/cuenta con ${c.email ?? "su email"}. Si ha olvidado la contraseña, mándale un enlace para poner otra.`
              : "Aún no tiene contraseña. Mándale un enlace para que la cree y pueda ver sus cursos online."}
          </p>
          <EnlaceAlumna clienteId={c.id} telefono={c.telefono} nombre={c.nombre} tieneCuenta={Boolean(c.userId)} />
        </section>
      )}

      {rgpd && (
        <section className="flex flex-col gap-3 rounded-xl border border-borde p-4">
          <h2 className="font-medium">Protección de datos</h2>
          <p className="text-sm text-texto-suave">
            Si la clienta pide una copia de sus datos, descárgala y envíasela. Si pide que la borres, su ficha se vacía: se
            quitan nombre, contacto y notas, y sus citas quedan sin datos personales. Sus pedidos se conservan porque la
            ley obliga a guardar los datos de facturación. También se borran su cuenta de alumna y su acceso a los cursos online.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={`/api/crm/clientas/exportar?id=${c.id}`}
              className="flex h-12 items-center justify-center rounded-full border border-marca px-6 font-medium text-marca"
            >
              Descargar sus datos
            </a>
            <form action={borrarClienta}>
              <input type="hidden" name="id" value={c.id} />
              <BotonConfirmar pregunta={`¿Borrar los datos de ${c.nombre}? No se puede deshacer.`}>Borrar sus datos</BotonConfirmar>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-texto-suave">{titulo}</span>
      <span>{children}</span>
    </div>
  );
}

function Cifra({ numero, texto, alerta = false }: { numero: number; texto: string; alerta?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-xl border p-3 ${alerta ? "border-error text-error" : "border-borde"}`}>
      <span className="text-2xl font-semibold">{numero}</span>
      <span className="text-sm">{texto}</span>
    </div>
  );
}
