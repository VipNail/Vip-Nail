import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";

// Cabecera provisional de la academia (se rehará con las maquetas de diseño).
export default function LayoutAcademia({ children }: LayoutProps<"/academia">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-borde bg-fondo/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
          <Link href="/" aria-label="Inicio">
            <Logo ancho={56} />
          </Link>
          <Link href="/academia" className="font-medium text-marca">
            Academia
          </Link>
          <Link href="/tienda" className="ml-auto text-sm text-texto-suave underline-offset-4 hover:underline">
            Tienda
          </Link>
          <Link href="/cuenta" className="rounded-full border border-marca px-3 py-1.5 text-sm font-medium text-marca">
            Mis cursos
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-texto-suave">Cargando…</p>}>{children}</Suspense>
      </div>
      <footer className="mt-10 border-t border-borde px-4 py-6 text-center text-sm text-texto-suave">
        VIP Nail Studio &amp; School · Academia en pruebas: los pagos son simulados.
      </footer>
    </div>
  );
}
