// Piezas de la tienda pública. Provisionales hasta las maquetas de diseño.
import Link from "next/link";
import type { TarjetaProducto } from "../consultas";
import { euros, type PrecioFinal } from "../precios";

/** Imagen provisional: iniciales sobre beige. DEBT: sustituir por la foto cuando haya subida de imágenes. */
export function FotoProvisional({ nombre, grande = false }: { nombre: string; grande?: boolean }) {
  const iniciales = nombre
    .split(/\s+/)
    .filter((p) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  return (
    <div
      aria-hidden
      className={`flex aspect-square w-full items-center justify-center rounded-lg bg-fondo-alterno font-serif text-marca/40 ${grande ? "text-7xl" : "text-4xl"}`}
    >
      {iniciales || "VIP"}
    </div>
  );
}

export function Precio({ p, grande = false }: { p: PrecioFinal; grande?: boolean }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className={`font-semibold ${p.oferta ? "text-error" : "text-texto"} ${grande ? "text-3xl" : ""}`}>{euros(p.precio)}</span>
      {p.oferta && <span className="text-sm text-texto-suave line-through">{euros(p.original)}</span>}
    </span>
  );
}

export function Tarjeta({ p }: { p: TarjetaProducto }) {
  return (
    <Link href={`/tienda/${p.slug}`} className="group flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-2 hover:border-marca">
      <div className="relative">
        <FotoProvisional nombre={p.nombre} />
        {p.precio.oferta && (
          <span className="absolute left-2 top-2 rounded-full bg-error px-2 py-0.5 text-xs font-medium text-superficie">
            -{p.precio.oferta.porcentaje} %
          </span>
        )}
        {p.stock <= 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-texto px-2 py-0.5 text-xs font-medium text-superficie">Agotado</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 pb-1">
        {p.marca && <span className="text-xs uppercase tracking-wide text-texto-suave">{p.marca}</span>}
        <span className="line-clamp-2 text-sm font-medium group-hover:underline">{p.nombre}</span>
        <span className="mt-auto">
          <Precio p={p.precio} />
        </span>
      </div>
    </Link>
  );
}
