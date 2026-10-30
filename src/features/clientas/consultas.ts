import "server-only";
import { and, asc, count, desc, eq, isNull, like, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cita, cliente, pedido, servicio, staff } from "@/db/schema";
import { academiaDeClienta } from "@/features/academia/consultas";
import { normalizarTelefono } from "./buscar";

export const POR_PAGINA = 30;

/** Condición de búsqueda: nombre, teléfono (también con espacios o +34) o email. */
function filtroBusqueda(q: string): SQL | undefined {
  const texto = q.trim();
  if (!texto) return undefined;
  const patron = `%${texto.replace(/[%_\\]/g, "\\$&")}%`;
  const tel = normalizarTelefono(texto);
  return or(
    like(cliente.nombre, patron),
    like(cliente.email, patron),
    tel && /^\+?\d{3,}$/.test(tel) ? like(cliente.telefono, `%${tel}%`) : undefined,
  );
}

export async function listarClientas(opciones: { q?: string; etiqueta?: string; pagina?: number }) {
  const pagina = Math.max(1, opciones.pagina ?? 1);
  const condicion = and(
    isNull(cliente.borradaAt),
    filtroBusqueda(opciones.q ?? ""),
    opciones.etiqueta ? sql`json_contains(${cliente.etiquetas}, ${JSON.stringify(opciones.etiqueta)})` : undefined,
  );

  const [filas, [{ total }]] = await Promise.all([
    db
      .select({
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        email: cliente.email,
        etiquetas: cliente.etiquetas,
        citas: sql<number>`count(case when ${cita.estado} <> 'cancelada' then 1 end)`,
        ultimaVisita: sql<Date | null>`max(case when ${cita.estado} = 'completada' then ${cita.inicio} end)`,
      })
      .from(cliente)
      .leftJoin(cita, eq(cita.clienteId, cliente.id))
      .where(condicion)
      .groupBy(cliente.id)
      .orderBy(asc(cliente.nombre))
      .limit(POR_PAGINA)
      .offset((pagina - 1) * POR_PAGINA),
    db.select({ total: count() }).from(cliente).where(condicion),
  ]);

  return {
    filas: filas.map((f) => ({
      ...f,
      citas: Number(f.citas),
      ultimaVisita: f.ultimaVisita ? new Date(f.ultimaVisita) : null,
    })),
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
  };
}

/** Todas las etiquetas en uso (para filtrar). */
export async function etiquetasEnUso(): Promise<string[]> {
  const filas = await db
    .select({ e: cliente.etiquetas })
    .from(cliente)
    .where(and(isNull(cliente.borradaAt), sql`json_length(${cliente.etiquetas}) > 0`));
  return [...new Set(filas.flatMap((f) => f.e ?? []))].sort((a, b) => a.localeCompare(b, "es"));
}

export async function obtenerClienta(id: string) {
  const [c] = await db.select().from(cliente).where(eq(cliente.id, id)).limit(1);
  return c ?? null;
}

/** Ficha única: datos + citas (las más recientes primero) + resumen. */
export async function fichaClienta(id: string) {
  const c = await obtenerClienta(id);
  if (!c) return null;
  const citas = await db
    .select({
      id: cita.id,
      inicio: cita.inicio,
      fin: cita.fin,
      estado: cita.estado,
      origen: cita.origen,
      servicio: servicio.nombre,
      persona: staff.nombre,
    })
    .from(cita)
    .innerJoin(servicio, eq(servicio.id, cita.servicioId))
    .innerJoin(staff, eq(staff.id, cita.staffId))
    .where(eq(cita.clienteId, id))
    .orderBy(desc(cita.inicio));

  const ahora = new Date();
  const proximas = citas.filter((x) => x.estado === "confirmada" && x.inicio >= ahora).reverse();
  const resumen = {
    hechas: citas.filter((x) => x.estado === "completada").length,
    noVino: citas.filter((x) => x.estado === "no_vino").length,
    canceladas: citas.filter((x) => x.estado === "cancelada").length,
    ultimaVisita: citas.find((x) => x.estado === "completada")?.inicio ?? null,
  };
  return { clienta: c, citas, proximas, resumen };
}

/** Fichas candidatas para fusionar con otra (búsqueda, sin la propia ni las borradas). */
export async function buscarParaFusion(id: string, q: string) {
  const filtro = filtroBusqueda(q);
  if (!filtro) return [];
  return db
    .select({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, email: cliente.email, citas: count(cita.id) })
    .from(cliente)
    .leftJoin(cita, eq(cita.clienteId, cliente.id))
    .where(and(ne(cliente.id, id), isNull(cliente.borradaAt), filtro))
    .groupBy(cliente.id)
    .orderBy(asc(cliente.nombre))
    .limit(20);
}

/** Todo lo que guardamos de una clienta (derecho de acceso / portabilidad, RGPD). */
export async function datosParaExportar(id: string) {
  const f = await fichaClienta(id);
  if (!f) return null;
  const { clienta: c } = f;
  return {
    exportado: new Date().toISOString(),
    responsable: "VIP Nail Studio & School",
    clienta: {
      nombre: c.nombre,
      telefono: c.telefono,
      email: c.email,
      etiquetas: c.etiquetas ?? [],
      notas: c.notas,
      origen: c.origen,
      consentimientoMarketing: c.consentimientoMarketing,
      consentimientoMarketingFecha: c.consentimientoMarketingAt?.toISOString() ?? null,
      alta: c.createdAt.toISOString(),
    },
    citas: f.citas.map((x) => ({
      inicio: x.inicio.toISOString(),
      fin: x.fin.toISOString(),
      servicio: x.servicio,
      profesional: x.persona,
      estado: x.estado,
      origen: x.origen,
    })),
    pedidos: (await db.select().from(pedido).where(eq(pedido.clienteId, id)).orderBy(desc(pedido.createdAt))).map((p) => ({
      numero: p.numero,
      fecha: p.createdAt.toISOString(),
      estado: p.estado,
      total: p.total / 100,
      entrega: p.envioNombre,
      direccion: p.direccion,
    })),
    ...(await academiaParaExportar(id)),
  };
}

async function academiaParaExportar(id: string) {
  const a = await academiaDeClienta(id);
  return {
    cursosOnline: a.accesos.map((x) => ({ curso: x.titulo, origen: x.origen, desde: x.desde.toISOString() })),
    cursosPresenciales: a.plazas.map((x) => ({ curso: x.titulo, fecha: x.inicio.toISOString(), estado: x.estado, pagado: x.importePagado / 100 })),
  };
}
