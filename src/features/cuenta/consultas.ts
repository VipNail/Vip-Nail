import "server-only";
// Lo que ve una alumna en su zona. Todo filtrado por SU ficha.
import { and, asc, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accesoCurso, convocatoria, curso, leccion, plaza, progreso } from "@/db/schema";

/** Acceso vigente a un curso online (sin fecha de fin o con fin futura). */
export async function tieneAcceso(clienteId: string, cursoId: string): Promise<boolean> {
  const [a] = await db
    .select({ id: accesoCurso.id })
    .from(accesoCurso)
    .where(and(eq(accesoCurso.clienteId, clienteId), eq(accesoCurso.cursoId, cursoId), or(isNull(accesoCurso.hasta), gt(accesoCurso.hasta, new Date()))))
    .limit(1);
  return Boolean(a);
}

export async function misCursos(clienteId: string) {
  const ahora = new Date();
  const online = await db
    .select({ id: curso.id, titulo: curso.titulo, resumen: curso.resumen, desde: accesoCurso.desde, hasta: accesoCurso.hasta })
    .from(accesoCurso)
    .innerJoin(curso, eq(curso.id, accesoCurso.cursoId))
    .where(and(eq(accesoCurso.clienteId, clienteId), or(isNull(accesoCurso.hasta), gt(accesoCurso.hasta, ahora))))
    .orderBy(desc(accesoCurso.desde));
  const ids = online.map((c) => c.id);
  const [lecciones, hechas] = ids.length
    ? await Promise.all([
        db.select({ id: leccion.id, cursoId: leccion.cursoId }).from(leccion).where(inArray(leccion.cursoId, ids)),
        db.select({ leccionId: progreso.leccionId }).from(progreso).where(eq(progreso.clienteId, clienteId)),
      ])
    : [[], []];
  const vistas = new Set(hechas.map((h) => h.leccionId));
  const conProgreso = online.map((c) => {
    const suyas = lecciones.filter((l) => l.cursoId === c.id);
    return { ...c, total: suyas.length, vistas: suyas.filter((l) => vistas.has(l.id)).length };
  });

  const presenciales = await db
    .select({
      id: plaza.id,
      titulo: curso.titulo,
      precio: curso.precio,
      inicio: convocatoria.inicio,
      horario: convocatoria.horario,
      lugar: convocatoria.lugar,
      estadoConv: convocatoria.estado,
      estado: plaza.estado,
      importePagado: plaza.importePagado,
    })
    .from(plaza)
    .innerJoin(convocatoria, eq(convocatoria.id, plaza.convocatoriaId))
    .innerJoin(curso, eq(curso.id, convocatoria.cursoId))
    .where(and(eq(plaza.clienteId, clienteId), inArray(plaza.estado, ["senal_pagada", "pagada"])))
    .orderBy(asc(convocatoria.inicio));
  return { online: conProgreso, presenciales: presenciales.map((p) => ({ ...p, pasado: p.inicio < ahora })) };
}

/** Curso con su temario y lo que ya ha visto. Null si no tiene acceso. */
export async function cursoDeAlumna(clienteId: string, cursoId: string) {
  if (!(await tieneAcceso(clienteId, cursoId))) return null;
  const [c] = await db.select().from(curso).where(and(eq(curso.id, cursoId), eq(curso.tipo, "online"))).limit(1);
  if (!c) return null;
  const lecciones = await db
    .select({ id: leccion.id, modulo: leccion.modulo, titulo: leccion.titulo, duracionMin: leccion.duracionMin, conVideo: sql<boolean>`${leccion.vimeoId} is not null` })
    .from(leccion)
    .where(eq(leccion.cursoId, cursoId))
    .orderBy(asc(leccion.orden), asc(leccion.createdAt));
  const hechas = lecciones.length
    ? await db.select({ id: progreso.leccionId }).from(progreso).where(and(eq(progreso.clienteId, clienteId), inArray(progreso.leccionId, lecciones.map((l) => l.id))))
    : [];
  const vistas = new Set(hechas.map((h) => h.id));
  return { curso: c, lecciones: lecciones.map((l) => ({ ...l, vista: vistas.has(l.id) })) };
}

/** Una lección con su vídeo, la anterior y la siguiente. Null si no tiene acceso al curso. */
export async function leccionDeAlumna(clienteId: string, leccionId: string) {
  const [l] = await db.select().from(leccion).where(eq(leccion.id, leccionId)).limit(1);
  if (!l) return null;
  const datos = await cursoDeAlumna(clienteId, l.cursoId);
  if (!datos) return null;
  const i = datos.lecciones.findIndex((x) => x.id === l.id);
  return {
    leccion: l,
    curso: datos.curso,
    vista: datos.lecciones[i]?.vista ?? false,
    posicion: i + 1,
    total: datos.lecciones.length,
    anterior: datos.lecciones[i - 1] ?? null,
    siguiente: datos.lecciones[i + 1] ?? null,
  };
}
