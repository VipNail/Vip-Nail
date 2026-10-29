import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/campo";
import { etiquetasEnUso, listarClientas } from "@/features/clientas/consultas";
import { tienePermiso } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Clientas" };

const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "2-digit", timeZone: "Europe/Madrid" });

export default async function Clientas({ searchParams }: PageProps<"/crm/clientas">) {
  const yo = await exigirEquipo("clientas.ver");
  const gestiona = tienePermiso(yo.rol, "clientas.gestionar");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  const etiqueta = typeof sp.etiqueta === "string" ? sp.etiqueta : "";
  const pagina = Number(sp.pagina) || 1;
  const [{ filas, total, paginas }, etiquetas] = await Promise.all([
    listarClientas({ q, etiqueta, pagina }),
    etiquetasEnUso(),
  ]);
  const enlace = (cambios: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(etiqueta && { etiqueta }), ...Object.fromEntries(Object.entries(cambios).map(([k, v]) => [k, String(v)])) });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/crm/clientas${p.size ? `?${p}` : ""}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-marca">Clientas</h1>
          <p className="text-sm text-texto-suave">
            {total} {total === 1 ? "ficha" : "fichas"}
            {q || etiqueta ? " encontradas" : ""}
          </p>
        </div>
        {gestiona && (
          <Link
            href="/crm/clientas/editar"
            className="flex h-12 items-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover"
          >
            Nueva clienta
          </Link>
        )}
      </div>

      {sp.aviso === "borrada" && <Aviso tipo="ok">Ficha borrada. Sus datos personales ya no se guardan.</Aviso>}

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Nombre, teléfono o email"
          aria-label="Buscar clienta"
          className="h-12 min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-3 text-base"
        />
        {etiqueta && <input type="hidden" name="etiqueta" value={etiqueta} />}
        <button type="submit" className="h-12 rounded-full bg-marca px-5 font-medium text-sobre-marca">
          Buscar
        </button>
      </form>

      {etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {etiquetas.map((e) => (
            <Link
              key={e}
              href={enlace({ etiqueta: e === etiqueta ? "" : e, pagina: "" })}
              className={`rounded-full border px-3 py-1 ${e === etiqueta ? "border-marca bg-marca text-sobre-marca" : "border-borde"}`}
            >
              {e}
            </Link>
          ))}
        </div>
      )}

      {filas.length === 0 ? (
        <p className="rounded-xl border border-borde p-4 text-texto-suave">
          {q || etiqueta ? "No hay ninguna ficha que coincida." : "Todavía no hay clientas. Se crean solas al apuntar citas, o con «Nueva clienta»."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filas.map((c) => (
            <li key={c.id}>
              <Link
                href={`/crm/clientas/ficha?id=${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-3 hover:border-marca"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{c.nombre}</span>
                  <span className="truncate text-sm text-texto-suave">{[c.telefono, c.email].filter(Boolean).join(" · ") || "Sin contacto"}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end text-sm">
                  <span>
                    {c.citas} {c.citas === 1 ? "cita" : "citas"}
                  </span>
                  {c.ultimaVisita && <span className="text-xs text-texto-suave">última {fecha.format(c.ultimaVisita)}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Páginas">
          {pagina > 1 ? (
            <Link href={enlace({ pagina: pagina - 1 })} className="rounded-full border border-borde px-4 py-2">
              ‹ Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-texto-suave">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={enlace({ pagina: pagina + 1 })} className="rounded-full border border-borde px-4 py-2">
              Siguiente ›
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
