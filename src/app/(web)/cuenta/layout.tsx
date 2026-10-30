import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";

// Zona de alumna (cabecera provisional hasta las maquetas de diseño).
export default function LayoutCuenta({ children }: LayoutProps<"/cuenta">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-borde bg-fondo/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-4 px-4">
          <Link href="/" aria-label="Inicio">
            <Logo ancho={56} />
          </Link>
          <Link href="/cuenta" className="font-medium text-marca">
            Mis cursos
          </Link>
          <Link href="/academia" className="ml-auto text-sm text-texto-suave underline-offset-4 hover:underline">
            Academia
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<p className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-texto-suave">Cargando…</p>}>{children}</Suspense>
      </div>
    </div>
  );
}
