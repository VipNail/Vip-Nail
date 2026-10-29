import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Campo, Selector } from "@/components/ui/campo";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { guardarAjustes } from "@/features/reservas/acciones";
import { leerAjustes } from "@/features/reservas/consultas";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ajustes de reserva" };

export default async function Ajustes({ searchParams }: PageProps<"/crm/reservas/ajustes">) {
  await exigirEquipo("reservas.configurar");
  const { aviso } = await searchParams;
  const a = await leerAjustes();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div>
        <Link href="/crm/reservas" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Reservas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Ajustes de reserva</h1>
      </div>
      {aviso === "guardado" && <Aviso tipo="ok">Ajustes guardados.</Aviso>}

      <FormularioAccion accion={guardarAjustes} cancelar="/crm/reservas">
        <Ayuda texto="Para no recibir citas «para dentro de 10 minutos».">
          <Campo etiqueta="Antelación mínima (horas)" name="antelacionHoras" type="number" inputMode="decimal" min={0} max={168} step={0.5} defaultValue={a.antelacionMinMin / 60} required />
        </Ayuda>
        <Ayuda texto="Hasta cuántos días por delante se puede reservar.">
          <Campo etiqueta="Reservar con hasta (días)" name="ventanaMaxDias" type="number" inputMode="numeric" min={1} max={365} defaultValue={a.ventanaMaxDias} required />
        </Ayuda>
        <Ayuda texto="Hasta cuántas horas antes puede la clienta cambiar o cancelar desde su enlace.">
          <Campo etiqueta="Cambiar o cancelar hasta (horas antes)" name="limiteCancelacionHoras" type="number" inputMode="numeric" min={0} max={168} defaultValue={a.limiteCancelacionHoras} required />
        </Ayuda>
        <Ayuda texto="Cada cuánto se ofrecen horas de inicio: con 15 min salen 10:00, 10:15, 10:30…">
          <Selector etiqueta="Las citas empiezan cada" name="pasoMin" defaultValue={String(a.pasoMin)}>
            {[5, 10, 15, 20, 30, 60].map((p) => (
              <option key={p} value={p}>
                {p} minutos
              </option>
            ))}
          </Selector>
        </Ayuda>
      </FormularioAccion>
    </main>
  );
}

function Ayuda({ texto, children }: { texto: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {children}
      <p className="text-sm text-texto-suave">{texto}</p>
    </div>
  );
}
