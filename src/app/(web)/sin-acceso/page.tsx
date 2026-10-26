import Link from "next/link";
import { BotonSalir } from "@/app/(crm)/crm/salir";

export default function SinAcceso() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sin acceso</h1>
      <p className="text-texto-suave">
        Tu cuenta no tiene permiso para esta parte del panel. Si crees que es un error, habla con
        administración.
      </p>
      <div className="flex gap-4">
        <Link href="/" className="underline underline-offset-4">
          Ir a la web
        </Link>
        <BotonSalir />
      </div>
    </main>
  );
}
