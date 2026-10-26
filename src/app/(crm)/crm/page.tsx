import { desc } from "drizzle-orm";
import { db } from "@/db";
import { actividad } from "@/db/schema";
import { NOMBRE_ROL } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";

const fechaMadrid = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

export default async function InicioCrm() {
  const yo = await exigirEquipo("crm.ver");
  const movimientos = await db
    .select()
    .from(actividad)
    .orderBy(desc(actividad.createdAt))
    .limit(10);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
      <section>
        <h1 className="text-2xl font-semibold">Hola, {yo.nombre}</h1>
        <p className="text-sm text-texto-suave">
          {yo.email} · {NOMBRE_ROL[yo.rol]}
        </p>
      </section>

      <section className="rounded-xl border border-borde p-4">
        <h2 className="font-medium">Últimos movimientos</h2>
        {movimientos.length === 0 ? (
          <p className="mt-2 text-sm text-texto-suave">Todavía no hay movimientos.</p>
        ) : (
          <ul className="mt-2 divide-y divide-borde text-sm">
            {movimientos.map((m) => (
              <li key={m.id} className="flex justify-between gap-4 py-2">
                <span>{m.descripcion}</span>
                <time className="shrink-0 text-texto-suave">{fechaMadrid.format(m.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
