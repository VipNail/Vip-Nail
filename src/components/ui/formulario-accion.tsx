"use client";
// Formulario genérico para acciones de servidor que devuelven { error }.
// Los campos llegan como children ya pintados en servidor.
import Link from "next/link";
import { useActionState } from "react";
import { Aviso, Boton } from "./campo";

type Accion = (estado: { error?: string }, datos: FormData) => Promise<{ error?: string }>;

export function FormularioAccion({
  accion,
  children,
  boton = "Guardar",
  cancelar,
}: {
  accion: Accion;
  children: React.ReactNode;
  boton?: string;
  cancelar?: string;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  return (
    <form action={enviar} className="flex flex-col gap-5">
      {estado.error && <Aviso>{estado.error}</Aviso>}
      {children}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {cancelar && (
          <Link
            href={cancelar}
            className="flex h-12 items-center justify-center rounded-full px-6 font-medium text-marca underline-offset-4 hover:underline"
          >
            Cancelar
          </Link>
        )}
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : boton}
        </Boton>
      </div>
    </form>
  );
}
