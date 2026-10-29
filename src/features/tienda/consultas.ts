import "server-only";
import { and, asc, count, desc, eq, gt, isNull, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categoria, marca, oferta, producto } from "@/db/schema";
import { patronLike } from "@/lib/texto";
import { precioFinal, type OfertaPrecio, type PrecioFinal } from "./precios";

// ── Categorías y marcas ──────────────────────────────────────────────────────

export type NodoCategoria = typeof categoria.$inferSelect & { hijas: (typeof categoria.$inferSelect)[] };

export async function arbolCategorias(soloVisibles = false) {
  const todas = await db
    .select()
    .from(categoria)
    .where(soloVisibles ? eq(categoria.visible, true) : undefined)
    .orderBy(asc(categoria.orden), asc(categoria.nombre));
  const raices: NodoCategoria[] = todas.filter((c) => !c.parentId).map((c) => ({ ...c, hijas: [] }));
  const porId = new Map(raices.map((r) => [r.id, r]));
  for (const c of todas) if (c.parentId) porId.get(c.parentId)?.hijas.push(c);
  return { raices, todas, padres: new Map(todas.map((c) => [c.id, c.parentId])) };
}

export async function listarMarcas() {
  return db.select().from(marca).orderBy(asc(marca.nombre));
}

/** Nº de productos por categoría y por marca (para saber si se pueden borrar). */
export async function recuentos() {
  const [porCategoria, porMarca] = await Promise.all([
    db.select({ id: producto.categoriaId, n: count() }).from(producto).groupBy(producto.categoriaId),
    db.select({ id: producto.marcaId, n: count() }).from(producto).groupBy(producto.marcaId),
  ]);
  return {
    categoria: new Map(porCategoria.map((x) => [x.id, x.n])),
    marca: new Map(porMarca.map((x) => [x.id, x.n])),
  };
}

// ── Ofertas ──────────────────────────────────────────────────────────────────

export async function ofertasVigentes(ahora = new Date()): Promise<OfertaPrecio[]> {
  return db
    .select({
      id: oferta.id,
      nombre: oferta.nombre,
      productoId: oferta.productoId,
      categoriaId: oferta.categoriaId,
      tipo: oferta.tipo,
      valor: oferta.valor,
      inicio: oferta.inicio,
      fin: oferta.fin,
    })
    .from(oferta)
    .where(and(lte(oferta.inicio, ahora), gt(oferta.fin, ahora)));
}

export async function listarOfertas() {
  return db
    .select({
      id: oferta.id,
      nombre: oferta.nombre,
      tipo: oferta.tipo,
      valor: oferta.valor,
      inicio: oferta.inicio,
      fin: oferta.fin,
      producto: producto.nombre,
      referencia: producto.referencia,
      categoria: categoria.nombre,
    })
    .from(oferta)
    .leftJoin(producto, eq(producto.id, oferta.productoId))
    .leftJoin(categoria, eq(categoria.id, oferta.categoriaId))
    .orderBy(desc(oferta.fin));
}

// ── Catálogo público ─────────────────────────────────────────────────────────

export const POR_PAGINA_TIENDA = 24;
export const ORDENES = { nombre: "Nombre", "precio-asc": "Precio: de menor a mayor", "precio-desc": "Precio: de mayor a menor", novedades: "Novedades" } as const;
export type Orden = keyof typeof ORDENES;

export type TarjetaProducto = {
  id: string;
  nombre: string;
  slug: string;
  referencia: string;
  marca: string | null;
  stock: number;
  precio: PrecioFinal;
};

/**
 * Productos activos de categorías visibles, con su precio final (ofertas aplicadas).
 * El catálogo es pequeño (≈1.000 fichas): se filtra en BD y se ordena por precio en memoria.
 */
export async function catalogo(f: {
  q?: string;
  categoriaId?: string | null;
  marcaId?: string | null;
  soloOferta?: boolean;
  conStock?: boolean;
  orden?: Orden;
  pagina?: number;
}) {
  const ahora = new Date();
  const [{ todas, padres }, ofertas] = await Promise.all([arbolCategorias(), ofertasVigentes(ahora)]);
  const ocultas = new Set(todas.filter((c) => !c.visible || (c.parentId && todas.find((p) => p.id === c.parentId && !p.visible))).map((c) => c.id));
  const dentro = f.categoriaId ? [f.categoriaId, ...todas.filter((c) => c.parentId === f.categoriaId).map((c) => c.id)] : null;

  const filas = await db
    .select({
      id: producto.id,
      nombre: producto.nombre,
      slug: producto.slug,
      referencia: producto.referencia,
      precio: producto.precio,
      stock: producto.stock,
      categoriaId: producto.categoriaId,
      marca: marca.nombre,
      createdAt: producto.createdAt,
    })
    .from(producto)
    .leftJoin(marca, eq(marca.id, producto.marcaId))
    .where(
      and(
        eq(producto.activo, true),
        f.q ? or(like(producto.nombre, patronLike(f.q)), like(producto.referencia, patronLike(f.q)), like(marca.nombre, patronLike(f.q))) : undefined,
        f.marcaId ? eq(producto.marcaId, f.marcaId) : undefined,
        f.conStock ? gt(producto.stock, 0) : undefined,
        dentro ? sql`${producto.categoriaId} in (${sql.join(dentro.map((d) => sql`${d}`), sql`, `)})` : undefined,
      ),
    );

  let lista: (TarjetaProducto & { creado: Date })[] = filas
    .filter((x) => !x.categoriaId || !ocultas.has(x.categoriaId))
    .map((x) => ({
      id: x.id,
      nombre: x.nombre,
      slug: x.slug,
      referencia: x.referencia,
      marca: x.marca,
      stock: x.stock,
      creado: x.createdAt,
      precio: precioFinal({ id: x.id, precio: x.precio, categoriaId: x.categoriaId }, ofertas, padres, ahora),
    }));
  if (f.soloOferta) lista = lista.filter((x) => x.precio.oferta);

  const orden = f.orden ?? "nombre";
  const es = new Intl.Collator("es");
  lista.sort((a, b) => {
    if (orden === "precio-asc") return a.precio.precio - b.precio.precio || es.compare(a.nombre, b.nombre);
    if (orden === "precio-desc") return b.precio.precio - a.precio.precio || es.compare(a.nombre, b.nombre);
    if (orden === "novedades") return b.creado.getTime() - a.creado.getTime();
    // Por defecto: con stock primero, luego por nombre.
    return Number(b.stock > 0) - Number(a.stock > 0) || es.compare(a.nombre, b.nombre);
  });

  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA_TIENDA));
  const pagina = Math.min(Math.max(1, f.pagina ?? 1), paginas);
  return {
    productos: lista.slice((pagina - 1) * POR_PAGINA_TIENDA, pagina * POR_PAGINA_TIENDA),
    total,
    pagina,
    paginas,
  };
}

export async function productoPublico(slug: string) {
  const [p] = await db
    .select({
      id: producto.id,
      nombre: producto.nombre,
      slug: producto.slug,
      referencia: producto.referencia,
      descripcion: producto.descripcion,
      precio: producto.precio,
      stock: producto.stock,
      categoriaId: producto.categoriaId,
      marca: marca.nombre,
      marcaSlug: marca.slug,
    })
    .from(producto)
    .leftJoin(marca, eq(marca.id, producto.marcaId))
    .where(and(eq(producto.slug, slug), eq(producto.activo, true)))
    .limit(1);
  if (!p) return null;
  const ahora = new Date();
  const [{ todas, padres }, ofertas] = await Promise.all([arbolCategorias(), ofertasVigentes(ahora)]);
  const cat = todas.find((c) => c.id === p.categoriaId) ?? null;
  const padre = cat?.parentId ? (todas.find((c) => c.id === cat.parentId) ?? null) : null;
  if ((cat && !cat.visible) || (padre && !padre.visible)) return null;
  return {
    ...p,
    categoria: cat,
    grupo: padre,
    precioFinal: precioFinal({ id: p.id, precio: p.precio, categoriaId: p.categoriaId }, ofertas, padres, ahora),
  };
}

// ── CRM ──────────────────────────────────────────────────────────────────────

export const POR_PAGINA_CRM = 30;

export async function productosCrm(f: { q?: string; categoriaId?: string; estado?: string; pagina?: number }) {
  const pagina = Math.max(1, f.pagina ?? 1);
  const { todas } = await arbolCategorias();
  const dentro = f.categoriaId === "sin" ? "sin" : f.categoriaId ? [f.categoriaId, ...todas.filter((c) => c.parentId === f.categoriaId).map((c) => c.id)] : null;
  const condicion = and(
    f.q ? or(like(producto.nombre, patronLike(f.q)), like(producto.referencia, patronLike(f.q)), like(producto.ean, patronLike(f.q))) : undefined,
    dentro === "sin" ? isNull(producto.categoriaId) : dentro ? sql`${producto.categoriaId} in (${sql.join(dentro.map((d) => sql`${d}`), sql`, `)})` : undefined,
    f.estado === "sin-stock" ? lte(producto.stock, 0) : undefined,
    f.estado === "inactivos" ? eq(producto.activo, false) : undefined,
    f.estado === "activos" ? eq(producto.activo, true) : undefined,
  );
  const [filas, [{ total }]] = await Promise.all([
    db
      .select({
        id: producto.id,
        nombre: producto.nombre,
        referencia: producto.referencia,
        precio: producto.precio,
        stock: producto.stock,
        activo: producto.activo,
        categoria: categoria.nombre,
      })
      .from(producto)
      .leftJoin(categoria, eq(categoria.id, producto.categoriaId))
      .where(condicion)
      .orderBy(asc(producto.nombre))
      .limit(POR_PAGINA_CRM)
      .offset((pagina - 1) * POR_PAGINA_CRM),
    db.select({ total: count() }).from(producto).where(condicion),
  ]);
  return { filas, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA_CRM)) };
}

export async function obtenerProducto(id: string) {
  const [p] = await db.select().from(producto).where(eq(producto.id, id)).limit(1);
  return p ?? null;
}
