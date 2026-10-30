"use client";
import { useActionState } from "react";
import { Aviso, Boton, Campo } from "@/components/ui/campo";
import { activarCuenta, type EstadoActivar } from "@/features/cuenta/acciones";

export function FormularioActivar({ ocultos }: { ocultos: Record<string, string> }) {
  const [estado, accion, enviando] = useActionState<EstadoActivar, FormData>(activarCuenta, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      {Object.entries(ocultos).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {estado.error && <Aviso>{estado.error}</Aviso>}
      <Campo etiqueta="Contraseña nueva (mínimo 10 caracteres)" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required />
      <Campo etiqueta="Repite la contraseña" name="repetir" type="password" autoComplete="new-password" minLength={10} maxLength={128} required />
      <Boton type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar y entrar"}
      </Boton>
    </form>
  );
}
