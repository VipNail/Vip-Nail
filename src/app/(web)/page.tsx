import Link from "next/link";
import { Logo } from "@/components/ui/logo";

// Portada provisional hasta tener las maquetas de diseño.
export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo ancho={200} prioridad />
      <span className="h-px w-16 bg-acento" aria-hidden />
      <p className="text-sm uppercase tracking-widest text-texto-suave">Nueva web en construcción</p>
      <p className="text-texto-suave">
        Estamos preparando la nueva web: estudio, reservas, tienda y academia en un solo sitio.
      </p>
      <Link href="/tienda" className="flex h-12 items-center rounded-full bg-marca px-6 font-medium text-sobre-marca">
        Ver la tienda (en pruebas)
      </Link>
      <Link href="/entrar" className="text-sm text-marca underline underline-offset-4">
        Acceso del equipo
      </Link>
    </main>
  );
}
