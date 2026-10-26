// Alta del PRIMER administrador. Solo funciona si:
//  1) existe la variable INSTALAR_TOKEN en el servidor, y
//  2) todavía no hay ningún admin.
// Después la página da 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { hayAdmin } from "@/features/equipo/alta";
import { FormularioInstalar } from "./formulario";

export const metadata: Metadata = { title: "Instalación" };

export default function Instalar() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Crear la primera cuenta</h1>
        <p className="mt-1 text-sm text-texto-suave">
          Cuenta de administración del CRM. Esta página desaparece al terminar.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-texto-suave">Comprobando…</p>}>
        <Comprobacion />
      </Suspense>
    </main>
  );
}

async function Comprobacion() {
  await connection();
  if (!process.env.INSTALAR_TOKEN || (await hayAdmin())) notFound();
  return <FormularioInstalar />;
}
