import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AreaTexto, Campo, Casilla, Selector } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { TIPOS_IVA } from "@/db/schema";
import { guardarCurso } from "@/features/academia/acciones";
import { obtenerCurso } from "@/features/academia/consultas";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Curso" };
const aTexto = (c: number) => (c / 100).toFixed(2).replace(".", ",");

// Sin ?id= es un curso nuevo (?tipo=online|presencial).
export default async function EditarCurso({ searchParams }: PageProps<"/crm/cursos/editar">) {
  await exigirEquipo("cursos.gestionar");
  const sp = await searchParams;
  const c = typeof sp.id === "string" ? await obtenerCurso(sp.id) : null;
  if (typeof sp.id === "string" && !c) notFound();
  const tipo = c?.tipo ?? (sp.tipo === "online" ? "online" : "presencial");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href={c ? `/crm/cursos/ver?id=${c.id}` : "/crm/cursos"} className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← {c ? c.titulo : "Cursos"}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">{c ? "Editar curso" : tipo === "online" ? "Nuevo curso online" : "Nuevo curso presencial"}</h1>
      </div>
      <FormularioAccion accion={guardarCurso} cancelar={c ? `/crm/cursos/ver?id=${c.id}` : "/crm/cursos"}>
        {c && <input type="hidden" name="id" value={c.id} />}
        <input type="hidden" name="tipo" value={tipo} />
        <Campo etiqueta="Título" name="titulo" defaultValue={c?.titulo} required maxLength={160} />
        <Campo etiqueta="Resumen (una frase para el listado)" name="resumen" defaultValue={c?.resumen ?? ""} maxLength={300} />
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Precio (€, IVA incl.)" name="precio" inputMode="decimal" defaultValue={c ? aTexto(c.precio) : ""} required placeholder="250" />
          <Selector etiqueta="IVA" name="tipoIva" defaultValue={String(c?.tipoIva ?? 21)}>
            {TIPOS_IVA.map((t) => (
              <option key={t} value={t}>
                {t} %
              </option>
            ))}
          </Selector>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Campo etiqueta="Nivel" name="nivel" defaultValue={c?.nivel ?? ""} maxLength={60} placeholder="Iniciación" />
          <Campo etiqueta="Duración" name="duracion" defaultValue={c?.duracion ?? ""} maxLength={60} placeholder={tipo === "online" ? "15 lecciones" : "2 días"} />
        </div>
        <AreaTexto etiqueta="Descripción (qué se aprende, a quién va dirigido, qué incluye)" name="descripcion" defaultValue={c?.descripcion ?? ""} maxLength={20000} rows={8} />
        <Campo etiqueta="Orden en el listado (0 = primero)" name="orden" type="number" inputMode="numeric" defaultValue={c?.orden ?? 0} />
        <Casilla name="visible" defaultChecked={c ? c.visible : true} etiqueta="Publicado en la academia" />
      </FormularioAccion>
    </main>
  );
}
