import "server-only";
import { and, asc, count, desc, eq, like, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pedido, pedidoLinea, type EstadoPedido } from "@/db/schema";
import { patronLike } from "@/lib/texto";

/** Pedido visto por la clienta: hace falta el número Y el enlace secreto. */
export async function pedidoPublico(numero: string, token: string) {
  if (!numero || !token) return null;
  const [p] = await db
    .select()
    .from(pedido)
    .where(and(eq(pedido.numero, numero), eq(pedido.tokenAcceso, token)))
    .limit(1);
  if (!p) return null;
  const lineas = await db.select().from(pedidoLinea).where(eq(pedidoLinea.pedidoId, p.id)).orderBy(asc(pedidoLinea.createdAt));
  return { ...p, lineas };
}

export const TEXTO_ESTADO: Record<EstadoPedido, { texto: string; clase: string }> = {
  pendiente_pago: { texto: "Pendiente de pago", clase: "border-acento text-acento-texto" },
  pagado: { texto: "Pagado", clase: "border-marca text-marca" },
  preparando: { texto: "Preparando", clase: "border-marca text-marca" },
  enviado: { texto: "Enviado", clase: "border-borde text-texto-suave" },
  cancelado: { texto: "Cancelado", clase: "border-borde text-texto-suave" },
  reembolsado: { texto: "Devuelto", clase: "border-error text-error" },
};

/** «Enviado» o «Listo para recoger» según la forma de entrega. */
export function textoEstado(estado: EstadoPedido, tipo: "envio" | "recogida") {
  if (estado === "enviado" && tipo === "recogida") return { ...TEXTO_ESTADO.enviado, texto: "Listo para recoger" };
  return TEXTO_ESTADO[estado];
}

// ── CRM ──────────────────────────────────────────────────────────────────────

export const POR_PAGINA_PEDIDOS = 30;

export async function pedidosCrm(f: { estado?: string; q?: string; pagina?: number }) {
  const pagina = Math.max(1, f.pagina ?? 1);
  const busqueda: SQL | undefined = f.q
    ? or(like(pedido.numero, patronLike(f.q)), like(pedido.nombre, patronLike(f.q)), like(pedido.email, patronLike(f.q)), like(pedido.telefono, patronLike(f.q)))
    : undefined;
  const filtroEstado: SQL | undefined =
    f.estado === "por-preparar"
      ? or(eq(pedido.estado, "pagado"), eq(pedido.estado, "preparando"))
      : f.estado && f.estado !== "todos"
        ? eq(pedido.estado, f.estado as EstadoPedido)
        : undefined;
  const cond = and(busqueda, filtroEstado);
  const [filas, [{ total }]] = await Promise.all([
    db
      .select({
        id: pedido.id,
        numero: pedido.numero,
        nombre: pedido.nombre,
        estado: pedido.estado,
        envioTipo: pedido.envioTipo,
        total: pedido.total,
        createdAt: pedido.createdAt,
        incidencia: pedido.incidencia,
      })
      .from(pedido)
      .where(cond)
      .orderBy(desc(pedido.createdAt))
      .limit(POR_PAGINA_PEDIDOS)
      .offset((pagina - 1) * POR_PAGINA_PEDIDOS),
    db.select({ total: count() }).from(pedido).where(cond),
  ]);
  return { filas, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA_PEDIDOS)) };
}

export async function contarPorPreparar() {
  const [{ n }] = await db.select({ n: count() }).from(pedido).where(or(eq(pedido.estado, "pagado"), eq(pedido.estado, "preparando")));
  return n;
}

export async function pedidoCrm(id: string) {
  const [p] = await db.select().from(pedido).where(eq(pedido.id, id)).limit(1);
  if (!p) return null;
  const lineas = await db.select().from(pedidoLinea).where(eq(pedidoLinea.pedidoId, p.id)).orderBy(asc(pedidoLinea.createdAt));
  return { ...p, lineas };
}

export async function pedidosDeClienta(clienteId: string) {
  return db
    .select({ id: pedido.id, numero: pedido.numero, estado: pedido.estado, envioTipo: pedido.envioTipo, total: pedido.total, createdAt: pedido.createdAt })
    .from(pedido)
    .where(eq(pedido.clienteId, clienteId))
    .orderBy(desc(pedido.createdAt));
}
