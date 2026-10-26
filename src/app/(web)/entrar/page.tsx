import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { FormularioEntrar } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <Logo ancho={120} className="self-center" prioridad />
      <div>
        <h1 className="text-2xl font-semibold text-marca">Acceso del equipo</h1>
        <p className="mt-1 text-sm text-texto-suave">Entra con tu email y contraseña.</p>
      </div>
      <FormularioEntrar />
    </main>
  );
}
