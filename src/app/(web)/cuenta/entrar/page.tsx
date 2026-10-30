import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { alumnaActual } from "@/lib/sesion";
import { FormularioEntrarAlumna } from "./formulario";

export const metadata: Metadata = { title: "Entrar a mis cursos", robots: { index: false, follow: false } };

export default async function EntrarAlumna() {
  if (await alumnaActual()) redirect("/cuenta");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-marca">Entra a tus cursos</h1>
        <p className="mt-1 text-sm text-texto-suave">Con el email y la contraseña de tu cuenta de alumna.</p>
      </div>
      <FormularioEntrarAlumna />
      <div className="flex flex-col gap-2 rounded-xl border border-borde bg-superficie p-4 text-sm text-texto-suave">
        <p>
          <strong className="text-texto">¿Aún no tienes contraseña?</strong> Si has comprado un curso, créala desde el enlace de tu pedido. Si eras alumna de la web anterior, pídenos tu enlace por WhatsApp.
        </p>
        <p>
          <strong className="text-texto">¿Has olvidado la contraseña?</strong> Escríbenos y te mandamos un enlace para crear una nueva.
        </p>
      </div>
    </main>
  );
}
