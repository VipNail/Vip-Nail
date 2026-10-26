import type { Metadata } from "next";
import Link from "next/link";
import { exigirEquipo } from "@/lib/sesion";
import { FormularioPersona } from "../formulario";

export const metadata: Metadata = { title: "Añadir persona" };

export default async function AltaPersona() {
  await exigirEquipo("equipo.gestionar");
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      <div>
        <Link href="/crm/equipo" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Equipo
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Añadir persona</h1>
      </div>
      <FormularioPersona />
    </main>
  );
}
