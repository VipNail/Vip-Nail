"use server";
// Catálogo desde el CRM (solo administración). Cuando llegue Factusol, nombre, precio y stock
// vendrán de allí y estas pantallas quedarán para lo que Factusol no tiene (descripción, categoría…).
import { and, count, eq, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { actividad, categoria, marca, oferta, producto, TIPOS_IVA } from "@/db/schema";
import { localAUtc } from "@/features/reservas/tiempo";
import { exigirEquipo } from "@/lib/sesion";
import { aSlug } from "@/lib/texto";
import { euros, leerEuros } from "./precios";

export type EstadoFormulario = { error?: string };
const ULID = z.string().length(26);

async function anotar(userId: string, tipo: string, descripcion: string) {
  await db.insert(actividad).values({ userId, tipo, descripcion: descripcion.slice(0, 255) });
}

async function slugLibre(tabla: typeof producto | typeof categoria | typeof marca, base: string, idActual?: string) {
  const raiz = aSlug(base);
  for (let n = 1; ; n++) {
    const candidato = n === 1 ? raiz : `${raiz}-${n}`;
    const [ocupado] = await db
      .select({ id: tabla.id })
      .from(tabla)
      .where(idActual ? and(eq(tabla.slug, candidato), ne(tabla.id, idActual)) : eq(tabla.slug, candidato))
      .limit(1);
    if (!ocupado) return candidato;
  }
}

// ── Productos ────────────────────────────────────────────────────────────────

const EsquemaProducto = z.object({
  id: ULID.optional().or(z.literal("")),
  referencia: z.string().trim().min(1, "Pon la referencia.").max(40),
  ean: z.string().trim().max(20).regex(/^\d*$/, "El código de barras solo lleva números."),
  nombre: z.string().trim().min(2, "Pon el nombre.").max(200),
  descripcion: z.string().trim().max(10000),
  categoriaId: ULID.or(z.literal("")),
  marcaId: ULID.or(z.literal("")),
  precio: z.string(),
  tipoIva: z.coerce.number().refine((v) => (TIPOS_IVA as readonly number[]).includes(v), "IVA no válido."),
  stock: z.coerce.number("Stock no válido.").int("El stock es un número entero.").min(-9999).max(999999),
  pesoG: z.string().trim().regex(/^\d*$/, "Peso en gramos, sin decimales."),
});

export async function guardarProducto(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("productos.gestionar");
  const r = EsquemaProducto.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  const precio = leerEuros(d.precio);
  if (precio === null || precio <= 0) return { error: "Precio no válido (por ejemplo: 12,95)." };
  const id = d.id || undefined;

  const [repe] = await db
    .select({ nombre: producto.nombre })
    .from(producto)
    .where(and(eq(producto.referencia, d.referencia), id ? ne(producto.id, id) : undefined))
    .limit(1);
  if (repe) return { error: `La referencia ${d.referencia} ya es de «${repe.nombre}».` };

  const datos = {
    referencia: d.referencia,
    ean: d.ean || null,
    nombre: d.nombre,
    descripcion: d.descripcion || null,
    categoriaId: d.categoriaId || null,
    marcaId: d.marcaId || null,
    precio,
    tipoIva: d.tipoIva,
    stock: d.stock,
    pesoG: d.pesoG ? Number(d.pesoG) : null,
    activo: formData.get("activo") === "on",
    destacado: formData.get("destacado") === "on",
  };
  if (id) {
    await db.update(producto).set({ ...datos, slug: await slugLibre(producto, d.nombre, id) }).where(eq(producto.id, id));
  } else {
    await db.insert(producto).values({ ...datos, slug: await slugLibre(producto, d.nombre) });
  }
  await anotar(yo.userId, id ? "producto.edicion" : "producto.alta", `${id ? "Producto editado" : "Producto nuevo"}: ${d.nombre} · ${euros(precio)}`);
  redirect(`/crm/productos?aviso=guardado&q=${encodeURIComponent(d.referencia)}`);
}

// ── Categorías y marcas ──────────────────────────────────────────────────────

export async function guardarCategoria(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("productos.gestionar");
  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  const parentId = String(formData.get("parentId") ?? "") || null;
  const orden = Number(formData.get("orden")) || 0;
  const visible = formData.get("visible") === "on";
  if (nombre.length < 2) redirect("/crm/productos/categorias?aviso=nombre");

  if (parentId) {
    // Solo dos niveles: la superior tiene que ser un grupo (sin superior) y no ella misma.
    const [p] = await db.select({ parentId: categoria.parentId }).from(categoria).where(eq(categoria.id, parentId)).limit(1);
    if (!p || p.parentId || parentId === id) redirect("/crm/productos/categorias?aviso=nivel");
    if (id) {
      const [{ n }] = await db.select({ n: count() }).from(categoria).where(eq(categoria.parentId, id));
      if (n > 0) redirect("/crm/productos/categorias?aviso=nivel");
    }
  }

  if (id) {
    await db.update(categoria).set({ nombre, parentId, orden, visible, slug: await slugLibre(categoria, nombre, id) }).where(eq(categoria.id, id));
  } else {
    await db.insert(categoria).values({ nombre, parentId, orden, visible, slug: await slugLibre(categoria, nombre) });
  }
  await anotar(yo.userId, "categoria.guardar", `Categoría guardada: ${nombre}`);
  redirect("/crm/productos/categorias?aviso=guardada");
}

export async function borrarCategoria(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("productos.gestionar");
  const id = String(formData.get("id") ?? "");
  const [[{ hijas }], [{ productos }]] = await Promise.all([
    db.select({ hijas: count() }).from(categoria).where(eq(categoria.parentId, id)),
    db.select({ productos: count() }).from(producto).where(eq(producto.categoriaId, id)),
  ]);
  if (hijas > 0 || productos > 0) redirect("/crm/productos/categorias?aviso=ocupada");
  const [c] = await db.select({ nombre: categoria.nombre }).from(categoria).where(eq(categoria.id, id)).limit(1);
  await db.delete(categoria).where(eq(categoria.id, id));
  if (c) await anotar(yo.userId, "categoria.borrar", `Categoría borrada: ${c.nombre}`);
  redirect("/crm/productos/categorias?aviso=borrada");
}

export async function guardarMarca(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("productos.gestionar");
  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 120);
  if (nombre.length < 2) redirect("/crm/productos/categorias?aviso=nombre#marcas");
  if (id) await db.update(marca).set({ nombre, slug: await slugLibre(marca, nombre, id) }).where(eq(marca.id, id));
  else await db.insert(marca).values({ nombre, slug: await slugLibre(marca, nombre) });
  await anotar(yo.userId, "marca.guardar", `Marca guardada: ${nombre}`);
  redirect("/crm/productos/categorias?aviso=guardada#marcas");
}

export async function borrarMarca(formData: FormData): Promise<void> {
  await exigirEquipo("productos.gestionar");
  const id = String(formData.get("id") ?? "");
  const [{ n }] = await db.select({ n: count() }).from(producto).where(eq(producto.marcaId, id));
  if (n > 0) redirect("/crm/productos/categorias?aviso=ocupada#marcas");
  await db.delete(marca).where(eq(marca.id, id));
  redirect("/crm/productos/categorias?aviso=borrada#marcas");
}

// ── Ofertas ──────────────────────────────────────────────────────────────────

const EsquemaOferta = z.object({
  nombre: z.string().trim().min(2, "Pon un nombre a la oferta (lo ve la clienta).").max(120),
  aplica: z.enum(["producto", "categoria"]),
  referencia: z.string().trim().max(40),
  categoriaId: ULID.or(z.literal("")),
  tipo: z.enum(["porcentaje", "importe"]),
  valor: z.string().trim(),
  desde: z.string(),
  hasta: z.string(),
});

export async function crearOferta(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const yo = await exigirEquipo("productos.gestionar");
  const r = EsquemaOferta.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;

  let productoId: string | null = null;
  let categoriaId: string | null = null;
  let sobre = "";
  if (d.aplica === "producto") {
    const [p] = await db
      .select({ id: producto.id, nombre: producto.nombre })
      .from(producto)
      .where(or(eq(producto.referencia, d.referencia), eq(producto.ean, d.referencia)))
      .limit(1);
    if (!p) return { error: `No hay ningún producto con la referencia «${d.referencia}».` };
    productoId = p.id;
    sobre = p.nombre;
  } else {
    const [c] = await db.select({ id: categoria.id, nombre: categoria.nombre }).from(categoria).where(eq(categoria.id, d.categoriaId)).limit(1);
    if (!c) return { error: "Elige la categoría." };
    categoriaId = c.id;
    sobre = `categoría ${c.nombre}`;
  }

  let valor: number;
  if (d.tipo === "porcentaje") {
    valor = Number(d.valor.replace(",", "."));
    if (!Number.isInteger(valor) || valor < 1 || valor > 90) return { error: "El descuento va de 1 a 90 %." };
  } else {
    const v = leerEuros(d.valor);
    if (v === null || v <= 0) return { error: "Importe de descuento no válido (por ejemplo: 2,50)." };
    valor = v;
  }

  const inicio = localAUtc(d.desde);
  const fin = localAUtc(d.hasta);
  if (!inicio || !fin) return { error: "Pon cuándo empieza y cuándo acaba." };
  if (fin <= inicio) return { error: "La oferta tiene que acabar después de empezar." };

  await db.insert(oferta).values({ nombre: d.nombre, productoId, categoriaId, tipo: d.tipo, valor, inicio, fin });
  await anotar(yo.userId, "oferta.alta", `Oferta «${d.nombre}» (${d.tipo === "porcentaje" ? `-${valor} %` : `-${euros(valor)}`}) en ${sobre}`);
  redirect("/crm/productos/ofertas?aviso=creada");
}

/** Termina una oferta ya (si aún no ha empezado, se borra). */
export async function terminarOferta(formData: FormData): Promise<void> {
  const yo = await exigirEquipo("productos.gestionar");
  const id = String(formData.get("id") ?? "");
  const [o] = await db.select().from(oferta).where(eq(oferta.id, id)).limit(1);
  if (o) {
    const ahora = new Date();
    if (o.inicio > ahora) await db.delete(oferta).where(eq(oferta.id, id));
    else if (o.fin > ahora) await db.update(oferta).set({ fin: ahora }).where(eq(oferta.id, id));
    await anotar(yo.userId, "oferta.fin", `Oferta terminada: ${o.nombre}`);
  }
  redirect("/crm/productos/ofertas?aviso=terminada");
}

// ── Datos de ejemplo ─────────────────────────────────────────────────────────

export async function cargarEjemploTienda(): Promise<void> {
  const yo = await exigirEquipo("productos.gestionar");
  const [{ n }] = await db.select({ n: count() }).from(producto);
  if (n > 0) redirect("/crm/productos");

  const grupos = [
    { nombre: "Molekula (ejemplo)", hijas: ["Esmaltes semipermanentes", "Bases y top"] },
    { nombre: "Staleks (ejemplo)", hijas: ["Alicates", "Limas"] },
    { nombre: "Desinfección (ejemplo)", hijas: [] as string[] },
  ];
  await db.transaction(async (tx) => {
    const ids: Record<string, string> = {};
    let orden = 0;
    for (const g of grupos) {
      const [r] = await tx.insert(categoria).values({ nombre: g.nombre, slug: aSlug(g.nombre), orden: orden++ }).$returningId();
      ids[g.nombre] = r.id;
      for (const h of g.hijas) {
        const [rh] = await tx.insert(categoria).values({ nombre: h, slug: aSlug(`${g.nombre}-${h}`), parentId: r.id, orden: orden++ }).$returningId();
        ids[h] = rh.id;
      }
    }
    const [mMol] = await tx.insert(marca).values({ nombre: "Molekula", slug: "molekula-ejemplo" }).$returningId();
    const [mSta] = await tx.insert(marca).values({ nombre: "Staleks", slug: "staleks-ejemplo" }).$returningId();
    const ejemplos = [
      ["EJ0001", "Esmalte semipermanente Nude Rosé 12 ml", "Esmaltes semipermanentes", mMol.id, 995, 25],
      ["EJ0002", "Esmalte semipermanente Rojo Pasión 12 ml", "Esmaltes semipermanentes", mMol.id, 995, 0],
      ["EJ0003", "Esmalte semipermanente Verde Bosque 12 ml", "Esmaltes semipermanentes", mMol.id, 995, 8],
      ["EJ0004", "Base rubber 15 ml", "Bases y top", mMol.id, 1450, 12],
      ["EJ0005", "Top sin capa de dispersión 15 ml", "Bases y top", mMol.id, 1450, 3],
      ["EJ0006", "Alicate de cutícula Expert 5 mm", "Alicates", mSta.id, 3290, 6],
      ["EJ0007", "Lima de papel 180/240 (25 uds.)", "Limas", mSta.id, 890, 40],
      ["EJ0008", "Desinfectante de superficies 1 L", "Desinfección (ejemplo)", null, 1275, 10],
    ] as const;
    for (const [ref, nombre, cat, marcaId, precio, stock] of ejemplos) {
      await tx.insert(producto).values({
        referencia: ref,
        nombre,
        slug: aSlug(nombre),
        categoriaId: ids[cat],
        marcaId,
        precio,
        stock,
        descripcion: "Producto de ejemplo para probar la tienda. Se sustituirá por el catálogo real de Factusol.",
      });
    }
    const ahora = new Date();
    await tx.insert(oferta).values({
      nombre: "Semana Molekula (ejemplo)",
      categoriaId: ids["Molekula (ejemplo)"],
      tipo: "porcentaje",
      valor: 15,
      inicio: ahora,
      fin: new Date(ahora.getTime() + 14 * 86_400_000),
    });
  });
  await anotar(yo.userId, "tienda.ejemplo", "Catálogo de ejemplo cargado (8 productos y 1 oferta)");
  redirect("/crm/productos?aviso=ejemplo");
}
