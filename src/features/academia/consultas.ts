import "server-only";
import { and, asc, count, desc, eq, gt, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { accesoCurso, cliente, convocatoria, curso, leccion, plaza } from "@/db/schema";
import { plazasLibres } from "./logica";

export async function listarCursos(soloVisibles = false) {
  const filas = await db
    .select()
    .from(curso)
    .where(soloVisibles ? eq(curso.visible, true) : undefined)
    .orderBy(asc(curso.tipo), asc(curso.orden), asc(curso.titulo));
  const [lecciones, alumnas] = await Promise.all([
    db.select({ id: leccion.cursoId, n: count() }).from(leccion).groupBy(leccion.cursoId),
    db.select({ id: accesoCurso.cursoId, n: count() }).from(accesoCurso).groupBy(accesoCurso.cursoId),
  ]);
  const nL = new Map(lecciones.map((x) => [x.id, x.n]));
  const nA = new Map(alumnas.map((x) => [x.id, x.n]));
  return filas.map((c) => ({ ...c, lecciones: nL.get(c.id) ?? 0, alumnas: nA.get(c.id) ?? 0 }));
}

export async function obtenerCurso(id: string) {
  const [c] = await db.select().from(curso).where(eq(curso.id, id)).limit(1);
  return c ?? null;
}

export async function cursoPorSlug(slug: string) {
  const [c] = await db.select().from(curso).where(and(eq(curso.slug, slug), eq(curso.visible, true))).limit(1);
  return c ?? null;
}

export async function leccionesDe(cursoId: string) {
  return db.select().from(leccion).where(eq(leccion.cursoId, cursoId)).orderBy(asc(leccion.orden), asc(leccion.createdAt));
}

/** Temario público: sin los datos de Vimeo. */
export async function temario(cursoId: string) {
  return db
    .select({ id: leccion.id, modulo: leccion.modulo, titulo: leccion.titulo, duracionMin: leccion.duracionMin })
    .from(leccion)
    .where(eq(leccion.cursoId, cursoId))
    .orderBy(asc(leccion.orden), asc(leccion.createdAt));
}

/** Convocatorias con sus plazas libres (las reservas sin pagar caducadas no cuentan). */
export async function convocatoriasDe(cursoId: string, opciones: { soloFuturas?: boolean } = {}) {
  const ahora = new Date();
  const filas = await db
    .select()
    .from(convocatoria)
    .where(and(eq(convocatoria.cursoId, cursoId), opciones.soloFuturas ? gt(convocatoria.inicio, ahora) : undefined))
    .orderBy(opciones.soloFuturas ? asc(convocatoria.inicio) : desc(convocatoria.inicio));
  if (!filas.length) return [];
  const plazas = await db
    .select({ convocatoriaId: plaza.convocatoriaId, estado: plaza.estado, caducaAt: plaza.caducaAt })
    .from(plaza)
    .where(inArray(plaza.convocatoriaId, filas.map((f) => f.id)));
  return filas.map((c) => {
    const suyas = plazas.filter((p) => p.convocatoriaId === c.id);
    const libres = plazasLibres(c.plazas, suyas, ahora);
    return { ...c, libres, ocupadas: c.plazas - libres };
  });
}

export async function obtenerConvocatoria(id: string) {
  const [c] = await db
    .select({ c: convocatoria, curso: curso })
    .from(convocatoria)
    .innerJoin(curso, eq(curso.id, convocatoria.cursoId))
    .where(eq(convocatoria.id, id))
    .limit(1);
  return c ?? null;
}

export async function plazasDe(convocatoriaId: string) {
  return db
    .select({
      id: plaza.id,
      estado: plaza.estado,
      modalidad: plaza.modalidad,
      importePagado: plaza.importePagado,
      caducaAt: plaza.caducaAt,
      pedidoId: plaza.pedidoId,
      notas: plaza.notas,
      createdAt: plaza.createdAt,
      clienteId: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email,
    })
    .from(plaza)
    .innerJoin(cliente, eq(cliente.id, plaza.clienteId))
    .where(and(eq(plaza.convocatoriaId, convocatoriaId), ne(plaza.estado, "cancelada")))
    .orderBy(asc(plaza.createdAt));
}

export async function alumnasDe(cursoId: string) {
  return db
    .select({ id: accesoCurso.id, origen: accesoCurso.origen, desde: accesoCurso.desde, clienteId: cliente.id, nombre: cliente.nombre, email: cliente.email })
    .from(accesoCurso)
    .innerJoin(cliente, eq(cliente.id, accesoCurso.clienteId))
    .where(eq(accesoCurso.cursoId, cursoId))
    .orderBy(desc(accesoCurso.desde));
}

/** Cursos y plazas de una clienta (para su ficha y la exportación RGPD). */
export async function academiaDeClienta(clienteId: string) {
  const [accesos, plazas] = await Promise.all([
    db
      .select({ id: accesoCurso.id, cursoId: curso.id, titulo: curso.titulo, origen: accesoCurso.origen, desde: accesoCurso.desde })
      .from(accesoCurso)
      .innerJoin(curso, eq(curso.id, accesoCurso.cursoId))
      .where(eq(accesoCurso.clienteId, clienteId))
      .orderBy(desc(accesoCurso.desde)),
    db
      .select({
        id: plaza.id,
        convocatoriaId: convocatoria.id,
        titulo: curso.titulo,
        inicio: convocatoria.inicio,
        estado: plaza.estado,
        importePagado: plaza.importePagado,
        caducaAt: plaza.caducaAt,
      })
      .from(plaza)
      .innerJoin(convocatoria, eq(convocatoria.id, plaza.convocatoriaId))
      .innerJoin(curso, eq(curso.id, convocatoria.cursoId))
      .where(and(eq(plaza.clienteId, clienteId), ne(plaza.estado, "cancelada")))
      .orderBy(desc(convocatoria.inicio)),
  ]);
  const ahora = new Date();
  // Las reservas sin pagar ya caducadas no se muestran.
  return { accesos, plazas: plazas.filter((p) => p.estado !== "reservada_pendiente" || (p.caducaAt && p.caducaAt > ahora)) };
}

export const TEXTO_PLAZA = {
  reservada_pendiente: { texto: "Pendiente de pago", clase: "border-acento text-acento-texto" },
  senal_pagada: { texto: "Señal pagada", clase: "border-marca text-marca" },
  pagada: { texto: "Pagada", clase: "border-marca text-marca" },
  cancelada: { texto: "Cancelada", clase: "border-borde text-texto-suave" },
} as const;
