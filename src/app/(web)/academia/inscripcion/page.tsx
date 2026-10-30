import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/ui/campo";
import { convocatoriasDe, obtenerConvocatoria, obtenerCurso } from "@/features/academia/consultas";
import { importeReserva } from "@/features/academia/logica";
import { proveedoresDisponibles } from "@/features/pagos/proveedores";
import { euros } from "@/features/tienda/precios";
import { FormularioInscripcion } from "./formulario";

export const metadata: Metadata = { title: "Inscripción", robots: { index: false, follow: false } };
const dia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Madrid" });

export default async function Inscripcion({ searchParams }: PageProps<"/academia/inscripcion">) {
  const q = await searchParams;
  const pagos = proveedoresDisponibles().map((p) => ({ id: p.id, nombre: p.nombre }));
  let titulo: string, detalle: string, total: number, slug: string, completo = false;
  let ocultos: Record<string, string>;

  if (typeof q.convocatoria === "string") {
    const r = await obtenerConvocatoria(q.convocatoria);
    if (!r || !r.curso.visible || r.curso.tipo !== "presencial") notFound();
    const modalidad = q.modalidad === "senal" ? "senal" : "total";
    const libre = (await convocatoriasDe(r.curso.id, { soloFuturas: true })).find((f) => f.id === r.c.id);
    completo = !libre || libre.estado !== "abierta" || libre.libres <= 0;
    total = importeReserva(r.curso.precio, r.c.precioSenal, modalidad);
    const esSenal = total < r.curso.precio;
    titulo = r.curso.titulo;
    slug = r.curso.slug;
    detalle = `${dia.format(r.c.inicio)}${r.c.lugar ? ` · ${r.c.lugar}` : ""}. ${esSenal ? `Pagas ahora la señal; el resto (${euros(r.curso.precio - total)}) se paga antes de empezar.` : "Pagas el curso completo."}`;
    ocultos = { convocatoriaId: r.c.id, modalidad };
  } else if (typeof q.curso === "string") {
    const c = await obtenerCurso(q.curso);
    if (!c || !c.visible || c.tipo !== "online") notFound();
    titulo = c.titulo;
    slug = c.slug;
    total = c.precio;
    detalle = "Curso online: tendrás acceso a todas las lecciones en cuanto se confirme el pago.";
    ocultos = { cursoId: c.id };
  } else notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      <div>
        <Link href={`/academia/${slug}`} className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Volver al curso
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Inscripción: {titulo}</h1>
        <p className="text-sm text-texto-suave first-letter:uppercase">{detalle}</p>
      </div>
      {pagos.some((p) => p.id === "prueba") && <Aviso>Web en pruebas: el pago es simulado y no se cobra nada.</Aviso>}
      {completo ? (
        <Aviso>Estas fechas ya no tienen plazas libres.</Aviso>
      ) : pagos.length === 0 ? (
        <Aviso>Ahora mismo no se pueden hacer pagos online. Escríbenos y te reservamos la plaza.</Aviso>
      ) : (
        <FormularioInscripcion ocultos={ocultos} pagos={pagos} total={euros(total)} />
      )}
    </main>
  );
}
