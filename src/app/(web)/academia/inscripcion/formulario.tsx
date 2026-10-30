"use client";
import { useActionState } from "react";
import { Aviso, Boton, Campo, Casilla } from "@/components/ui/campo";
import { crearInscripcion, type EstadoFormulario } from "@/features/academia/acciones-web";

type Pago = { id: string; nombre: string };

export function FormularioInscripcion({ ocultos, pagos, total }: { ocultos: Record<string, string>; pagos: Pago[]; total: string }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearInscripcion, {});
  return (
    <form action={accion} className="flex flex-col gap-6">
      {Object.entries(ocultos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-medium">Tus datos</legend>
        <Campo etiqueta="Nombre y apellidos" name="nombre" autoComplete="name" required maxLength={160} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Email" name="email" type="email" autoComplete="email" required maxLength={191} />
          <Campo etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" required maxLength={32} />
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-medium">Pago</legend>
        {pagos.map((p, i) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-borde bg-superficie p-3 has-[:checked]:border-marca">
            <input type="radio" name="pago" value={p.id} defaultChecked={i === 0} className="size-5" />
            <span className="font-medium">{p.nombre}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex justify-between rounded-xl border border-borde p-4 text-lg font-semibold">
        <span>Total a pagar</span>
        <span>{total}</span>
      </div>
      <div className="flex flex-col gap-1">
        {/* DEBT: enlazar condiciones de los cursos y privacidad cuando diseño las entregue. */}
        <Casilla name="acepto" required etiqueta="He leído y acepto las condiciones de los cursos y la política de privacidad" />
        <Casilla name="novedades" etiqueta="Quiero recibir novedades y promociones (opcional)" />
      </div>
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Un momento…" : "Pagar"}
      </Boton>
    </form>
  );
}
