import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaTexto, Aviso, BotonSecundario, Campo } from "@/components/ui/campo";
import { EnlaceConfirmar } from "@/components/ui/enlace-confirmar";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { borrarLeccion, darAcceso, guardarConvocatoria, guardarLeccion, quitarAcceso } from "@/features/academia/acciones";
import { alumnasDe, convocatoriasDe, leccionesDe, obtenerCurso } from "@/features/academia/consultas";
import { fechaMadrid, horaMadrid } from "@/features/reservas/tiempo";
import { euros } from "@/features/tienda/precios";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Curso" };

const AVISOS: Record<string, [string, "ok" | "error"]> = {
  guardado: ["Curso guardado.", "ok"],
  leccion: ["Lección guardada.", "ok"],
  "leccion-borrada": ["Lección borrada.", "ok"],
  acceso: ["Acceso dado.", "ok"],
  "acceso-quitado": ["Acceso quitado.", "ok"],
  "sin-clienta": ["No hay ninguna clienta con ese email o teléfono. Créala primero en Clientas.", "error"],
  "ya-tiene": ["Esa clienta ya tiene este curso.", "ok"],
  convocatoria: ["Fechas guardadas.", "ok"],
};
const dia = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" });
const local = (d: Date) => `${fechaMadrid(d)}T${horaMadrid(d)}`;
const aTexto = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export default async function VerCurso({ searchParams }: PageProps<"/crm/cursos/ver">) {
  await exigirEquipo("cursos.gestionar");
  const sp = await searchParams;
  const c = typeof sp.id === "string" ? await obtenerCurso(sp.id) : null;
  if (!c) notFound();
  const aviso = typeof sp.aviso === "string" ? AVISOS[sp.aviso] : undefined;
  const online = c.tipo === "online";
  const [lecciones, alumnas, fechas] = await Promise.all([
    online ? leccionesDe(c.id) : Promise.resolve([]),
    online ? alumnasDe(c.id) : Promise.resolve([]),
    online ? Promise.resolve([]) : convocatoriasDe(c.id),
  ]);
  const editLeccion = lecciones.find((l) => l.id === sp.leccion);
  const editConv = fechas.find((f) => f.id === sp.conv);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/cursos" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Cursos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">{c.titulo}</h1>
        <p className="text-sm text-texto-suave">
          {online ? "Online" : "Presencial"} · {euros(c.precio)}
          {c.duracion ? ` · ${c.duracion}` : ""} · {c.visible ? "publicado" : "oculto"}
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <Link href={`/crm/cursos/editar?id=${c.id}`} className="underline underline-offset-4">
            Editar datos
          </Link>
          {c.visible && (
            <Link href={`/academia/${c.slug}`} className="underline underline-offset-4">
              Ver en la academia
            </Link>
          )}
        </div>
      </div>
      {aviso && <Aviso tipo={aviso[1]}>{aviso[0]}</Aviso>}

      {online ? (
        <>
          <section id="lecciones" className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Lecciones ({lecciones.length})</h2>
            {lecciones.length > 0 && (
              <ol className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
                {lecciones.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        {l.orden}. {l.titulo}
                      </span>
                      <span className="text-xs text-texto-suave">
                        {[l.modulo, l.duracionMin ? `${l.duracionMin} min` : null, l.vimeoId ? "vídeo puesto" : "sin vídeo"].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-3 text-sm">
                      <Link href={`/crm/cursos/ver?id=${c.id}&leccion=${l.id}#editar-leccion`} className="underline underline-offset-4">
                        Editar
                      </Link>
                      <form action={borrarLeccion}>
                        <input type="hidden" name="id" value={l.id} />
                        <input type="hidden" name="cursoId" value={c.id} />
                        <EnlaceConfirmar className="text-error underline underline-offset-4" pregunta={`¿Borrar la lección «${l.titulo}»?`}>
                          Borrar
                        </EnlaceConfirmar>
                      </form>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div id="editar-leccion" className="rounded-xl border border-borde p-4">
              <h3 className="mb-3 font-medium">{editLeccion ? `Editar: ${editLeccion.titulo}` : "Añadir lección"}</h3>
              <FormularioAccion key={editLeccion?.id ?? "nueva"} accion={guardarLeccion} cancelar={editLeccion ? `/crm/cursos/ver?id=${c.id}#lecciones` : undefined}>
                <input type="hidden" name="cursoId" value={c.id} />
                {editLeccion && <input type="hidden" name="id" value={editLeccion.id} />}
                <Campo etiqueta="Título" name="titulo" defaultValue={editLeccion?.titulo} required maxLength={160} />
                <div className="grid grid-cols-2 gap-4">
                  <Campo etiqueta="Módulo (opcional)" name="modulo" defaultValue={editLeccion?.modulo ?? ""} maxLength={120} placeholder="Introducción" />
                  <Campo etiqueta="Orden" name="orden" type="number" inputMode="numeric" defaultValue={editLeccion?.orden ?? lecciones.length + 1} />
                </div>
                <Campo
                  etiqueta="Enlace del vídeo en Vimeo"
                  name="vimeo"
                  defaultValue={editLeccion?.vimeoId ? `https://vimeo.com/${editLeccion.vimeoId}${editLeccion.vimeoHash ? `/${editLeccion.vimeoHash}` : ""}` : ""}
                  maxLength={300}
                  placeholder="https://vimeo.com/123456789"
                />
                <Campo etiqueta="Duración (minutos)" name="duracionMin" inputMode="numeric" defaultValue={editLeccion?.duracionMin ?? ""} />
                <AreaTexto etiqueta="Notas de la lección (opcional)" name="descripcion" defaultValue={editLeccion?.descripcion ?? ""} maxLength={5000} rows={3} />
              </FormularioAccion>
            </div>
          </section>

          <section id="alumnas" className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">Alumnas con acceso ({alumnas.length})</h2>
            {alumnas.length > 0 && (
              <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
                {alumnas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <Link href={`/crm/clientas/ficha?id=${a.clienteId}`} className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{a.nombre}</span>
                      <span className="text-xs text-texto-suave">
                        {{ compra: "Compra web", manual: "Dado a mano", migracion: "Migrado" }[a.origen]} · {dia.format(a.desde)}
                      </span>
                    </Link>
                    <form action={quitarAcceso}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="cursoId" value={c.id} />
                      <EnlaceConfirmar className="text-sm text-error underline underline-offset-4" pregunta={`¿Quitar a ${a.nombre} el acceso a este curso?`}>
                        Quitar
                      </EnlaceConfirmar>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={darAcceso} className="flex flex-col gap-3 rounded-xl border border-borde p-4 sm:flex-row sm:items-end">
              <input type="hidden" name="cursoId" value={c.id} />
              <div className="flex-1">
                <Campo etiqueta="Dar acceso a una clienta (email o teléfono)" name="contacto" required maxLength={191} />
              </div>
              <BotonSecundario type="submit">Dar acceso</BotonSecundario>
            </form>
          </section>
        </>
      ) : (
        <section id="fechas" className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Fechas ({fechas.length})</h2>
          {fechas.length > 0 && (
            <ul className="flex flex-col divide-y divide-borde rounded-xl border border-borde bg-superficie">
              {fechas.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link href={`/crm/cursos/convocatoria?id=${f.id}`} className="flex min-w-0 flex-col">
                    <span className="font-medium first-letter:uppercase">{dia.format(f.inicio)}</span>
                    <span className="text-sm text-texto-suave">
                      {f.ocupadas}/{f.plazas} plazas · {{ abierta: "abierta", cerrada: "cerrada", cancelada: "cancelada" }[f.estado]}
                      {f.inicio < new Date() ? " · pasada" : ""}
                    </span>
                  </Link>
                  <span className="flex shrink-0 gap-3 text-sm">
                    <Link href={`/crm/cursos/convocatoria?id=${f.id}`} className="font-medium text-marca underline underline-offset-4">
                      Alumnas
                    </Link>
                    <Link href={`/crm/cursos/ver?id=${c.id}&conv=${f.id}#editar-fecha`} className="underline underline-offset-4">
                      Editar
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div id="editar-fecha" className="rounded-xl border border-borde p-4">
            <h3 className="mb-3 font-medium">{editConv ? "Editar fechas" : "Añadir fechas"}</h3>
            <FormularioAccion key={editConv?.id ?? "nueva"} accion={guardarConvocatoria} cancelar={editConv ? `/crm/cursos/ver?id=${c.id}#fechas` : undefined}>
              <input type="hidden" name="cursoId" value={c.id} />
              {editConv && <input type="hidden" name="id" value={editConv.id} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Empieza" name="inicio" type="datetime-local" defaultValue={editConv ? local(editConv.inicio) : ""} required />
                <Campo etiqueta="Acaba" name="fin" type="datetime-local" defaultValue={editConv ? local(editConv.fin) : ""} required />
              </div>
              <Campo etiqueta="Horario (texto para la web)" name="horario" defaultValue={editConv?.horario ?? ""} maxLength={160} placeholder="Sábado y domingo de 10:00 a 18:00" />
              <Campo etiqueta="Lugar" name="lugar" defaultValue={editConv?.lugar ?? "VIP Nail Studio"} maxLength={160} />
              <div className="grid grid-cols-2 gap-4">
                <Campo etiqueta="Plazas" name="plazas" type="number" inputMode="numeric" min={1} defaultValue={editConv?.plazas ?? 6} required />
                <Campo etiqueta="Señal (€, vacío = sin señal)" name="senal" inputMode="decimal" defaultValue={editConv?.precioSenal ? aTexto(editConv.precioSenal) : ""} placeholder="50" />
              </div>
            </FormularioAccion>
          </div>
        </section>
      )}
    </main>
  );
}
