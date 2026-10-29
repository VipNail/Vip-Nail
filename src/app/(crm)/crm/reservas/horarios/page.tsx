import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { guardarHorario } from "@/features/reservas/acciones";
import { horarioDe, horariosPorPersona, listarPersonasActivas } from "@/features/reservas/consultas";
import { aHora } from "@/features/reservas/tiempo";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Horarios" };

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const CORTO = ["", "L", "M", "X", "J", "V", "S", "D"];

type Franja = { diaSemana: number; inicioMin: number; finMin: number };

/** «L–V 10:00–14:00 y 16:00–20:00 · S 10:00–14:00» */
function resumen(franjas: Franja[]): string {
  const texto = (d: number) =>
    franjas
      .filter((f) => f.diaSemana === d)
      .map((f) => `${aHora(f.inicioMin)}–${aHora(f.finMin)}`)
      .join(" y ");
  const grupos: { desde: number; hasta: number; t: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const t = texto(d);
    if (!t) continue;
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.t === t && ultimo.hasta === d - 1) ultimo.hasta = d;
    else grupos.push({ desde: d, hasta: d, t });
  }
  if (!grupos.length) return "Sin horario: no se le pueden reservar citas.";
  return grupos
    .map((g) => `${CORTO[g.desde]}${g.hasta > g.desde ? `–${CORTO[g.hasta]}` : ""} ${g.t}`)
    .join(" · ");
}

export default async function Horarios({ searchParams }: PageProps<"/crm/reservas/horarios">) {
  await exigirEquipo("reservas.configurar");
  const { staff: staffId, aviso } = await searchParams;
  const personas = await listarPersonasActivas();

  if (typeof staffId === "string") {
    const persona = personas.find((p) => p.id === staffId);
    if (!persona) notFound();
    const franjas = await horarioDe(staffId);
    const valor = (dia: number, k: number, campo: "inicioMin" | "finMin") => {
      const f = franjas.filter((x) => x.diaSemana === dia)[k - 1];
      return f ? aHora(f[campo]) : "";
    };

    return (
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
        <div>
          <Link href="/crm/reservas/horarios" className="text-sm text-texto-suave underline-offset-4 hover:underline">
            ← Horarios
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-marca">Horario de {persona.nombre}</h1>
          <p className="text-sm text-texto-suave">
            Hasta dos franjas por día (mañana y tarde). Deja vacío el día que no trabaja. Para vacaciones o un día
            suelto, usa «Vacaciones y bloqueos».
          </p>
        </div>

        <FormularioAccion accion={guardarHorario} cancelar="/crm/reservas/horarios" boton="Guardar horario">
          <input type="hidden" name="staffId" value={staffId} />
          {[1, 2, 3, 4, 5, 6, 7].map((dia) => (
            <fieldset key={dia} className="flex flex-col gap-2 rounded-xl border border-borde p-3">
              <legend className="px-1 font-medium">{DIAS[dia]}</legend>
              {[1, 2].map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm text-texto-suave">{k === 1 ? "Mañana" : "Tarde"}</span>
                  <input
                    type="time"
                    name={`d${dia}_i${k}`}
                    defaultValue={valor(dia, k, "inicioMin")}
                    step={300}
                    aria-label={`${DIAS[dia]}, ${k === 1 ? "mañana" : "tarde"}: entrada`}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-2 text-base"
                  />
                  <span aria-hidden>–</span>
                  <input
                    type="time"
                    name={`d${dia}_f${k}`}
                    defaultValue={valor(dia, k, "finMin")}
                    step={300}
                    aria-label={`${DIAS[dia]}, ${k === 1 ? "mañana" : "tarde"}: salida`}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-borde bg-superficie px-2 text-base"
                  />
                </div>
              ))}
            </fieldset>
          ))}
        </FormularioAccion>
      </main>
    );
  }

  const horarios = await horariosPorPersona();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
      <div>
        <Link href="/crm/reservas" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Reservas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Horarios</h1>
        <p className="text-sm text-texto-suave">El horario de cada semana. Pulsa en una persona para cambiarlo.</p>
      </div>
      {aviso === "guardado" && <Aviso tipo="ok">Horario guardado.</Aviso>}
      <ul className="flex flex-col gap-3">
        {personas.map((p) => (
          <li key={p.id}>
            <Link
              href={`/crm/reservas/horarios?staff=${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-borde bg-superficie p-4 hover:border-marca"
            >
              <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ backgroundColor: p.colorAgenda }} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{p.nombre}</span>
                <span className="text-sm text-texto-suave">{resumen(horarios.get(p.id) ?? [])}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
