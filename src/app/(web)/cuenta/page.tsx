import type { Metadata } from "next";
import Link from "next/link";
import { Aviso } from "@/components/ui/campo";
import { misCursos } from "@/features/cuenta/consultas";
import { euros } from "@/features/tienda/precios";
import { exigirAlumna } from "@/lib/sesion";
import { Salir } from "./salir";

export const metadata: Metadata = { title: "Mis cursos", robots: { index: false, follow: false } };
const dia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export default async function MisCursos({ searchParams }: PageProps<"/cuenta">) {
  const a = await exigirAlumna();
  const sp = await searchParams;
  const { online, presenciales } = await misCursos(a.clienteId);
  const proximos = presenciales.filter((p) => !p.pasado && p.estadoConv !== "cancelada");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-marca">Hola, {a.nombre.split(" ")[0]}</h1>
          <p className="text-sm text-texto-suave">{a.email}</p>
        </div>
        <Salir />
      </div>
      {sp.aviso === "bienvenida" && <Aviso tipo="ok">¡Listo! Ya tienes tu contraseña. A partir de ahora entra con tu email.</Aviso>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Cursos online</h2>
        {!online.length ? (
          <p className="text-sm text-texto-suave">
            Todavía no tienes cursos online.{" "}
            <Link href="/academia" className="underline underline-offset-4">
              Mira la academia
            </Link>
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {online.map((c) => {
              const pct = c.total ? Math.round((c.vistas / c.total) * 100) : 0;
              return (
                <li key={c.id}>
                  <Link href={`/cuenta/curso?id=${c.id}`} className="flex h-full flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4 hover:border-marca">
                    <span className="text-lg font-medium text-marca">{c.titulo}</span>
                    <span className="text-sm text-texto-suave">
                      {c.vistas} de {c.total} lecciones vistas
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-borde" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso">
                      <span className="block h-full bg-marca" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="mt-1 text-sm font-medium">{c.vistas === 0 ? "Empezar →" : pct === 100 ? "Repasar →" : "Continuar →"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {proximos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Cursos presenciales</h2>
          <ul className="flex flex-col gap-3">
            {proximos.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 rounded-2xl border border-borde bg-superficie p-4">
                <span className="font-medium text-marca">{p.titulo}</span>
                <span className="text-sm first-letter:uppercase">{dia.format(p.inicio)}</span>
                <span className="text-sm text-texto-suave">{[p.horario, p.lugar].filter(Boolean).join(" · ")}</span>
                <span className="text-sm">
                  {p.estado === "pagada" ? "Plaza pagada ✓" : `Señal pagada (${euros(p.importePagado)}). Te queda por pagar ${euros(p.precio - p.importePagado)} antes de empezar.`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
