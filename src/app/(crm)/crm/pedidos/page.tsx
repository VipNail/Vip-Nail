import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaEnlace } from "@/components/ui/campo";
import { pedidosCrm, textoEstado } from "@/features/tienda/pedidos";
import { euros } from "@/features/tienda/precios";
import { tienePermiso } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Pedidos" };

const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const FILTROS = [
  ["por-preparar", "Por preparar"],
  ["pendiente_pago", "Sin pagar"],
  ["enviado", "Enviados"],
  ["todos", "Todos"],
] as const;

export default async function Pedidos({ searchParams }: PageProps<"/crm/pedidos">) {
  const yo = await exigirEquipo("pedidos.gestionar");
  const sp = await searchParams;
  const estado = typeof sp.estado === "string" ? sp.estado : "por-preparar";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const pagina = Number(sp.pagina) || 1;
  const { filas, total, paginas } = await pedidosCrm({ estado, q, pagina });
  const enlace = (c: Record<string, string>) => {
    const p = new URLSearchParams({ estado, q, ...c });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/crm/pedidos?${p}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-marca">Pedidos</h1>
        <p className="text-sm text-texto-suave">
          {total} {total === 1 ? "pedido" : "pedidos"}
        </p>
      </div>

      {tienePermiso(yo.rol, "productos.gestionar") && (
        <TarjetaEnlace href="/crm/pedidos/envios" titulo="Formas de entrega" texto="Precio del envío, envío gratis y recogida en el estudio." />
      )}

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar pedidos">
        {FILTROS.map(([k, v]) => (
          <Link key={k} href={enlace({ estado: k, pagina: "" })} className={`rounded-full border px-3 py-1.5 ${estado === k ? "border-marca bg-marca text-sobre-marca" : "border-borde"}`}>
            {v}
          </Link>
        ))}
      </nav>

      <form className="flex gap-2">
        <input type="hidden" name="estado" value={estado} />
        <input type="search" name="q" defaultValue={q} placeholder="Número, nombre, email o teléfono" aria-label="Buscar pedido" className="h-12 min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-3 text-base" />
        <button type="submit" className="h-12 rounded-full bg-marca px-5 font-medium text-sobre-marca">
          Buscar
        </button>
      </form>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-borde p-4 text-texto-suave">No hay pedidos aquí.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filas.map((p) => {
            const e = textoEstado(p.estado, p.envioTipo);
            return (
              <li key={p.id}>
                <Link href={`/crm/pedidos/ver?id=${p.id}`} className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-3 hover:border-marca">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">
                      {p.numero} · {p.nombre}
                    </span>
                    <span className="text-sm text-texto-suave">
                      {fecha.format(p.createdAt)} · {p.envioTipo === "recogida" ? "Recogida" : "Envío"}
                      {p.incidencia && <span className="text-error"> · ⚠ revisar</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium">{euros(p.total)}</span>
                    <span className={`rounded-full border px-2 text-xs ${e.clase}`}>{e.texto}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Páginas">
          {pagina > 1 ? <Link href={enlace({ pagina: String(pagina - 1) })} className="rounded-full border border-borde px-4 py-2">‹ Anterior</Link> : <span />}
          <span className="text-texto-suave">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? <Link href={enlace({ pagina: String(pagina + 1) })} className="rounded-full border border-borde px-4 py-2">Siguiente ›</Link> : <span />}
        </nav>
      )}
    </main>
  );
}
