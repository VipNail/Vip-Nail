import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";

// Cabecera provisional de la tienda (se rehará con las maquetas de diseño).
export default function LayoutTienda({ children }: LayoutProps<"/tienda">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-borde bg-fondo/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
          <Link href="/" aria-label="Inicio">
            <Logo ancho={56} />
          </Link>
          <Link href="/tienda" className="font-medium text-marca">
            Tienda
          </Link>
          <form action="/tienda" className="ml-auto flex min-w-0 flex-1 justify-end">
            <input
              type="search"
              name="q"
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className="h-10 w-full max-w-xs rounded-full border border-borde bg-superficie px-4 text-base"
            />
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-texto-suave">Cargando…</p>}>{children}</Suspense>
      </div>
      <footer className="mt-10 border-t border-borde px-4 py-6 text-center text-sm text-texto-suave">
        VIP Nail Studio &amp; School · Tienda en pruebas: aún no se pueden hacer pedidos.
      </footer>
    </div>
  );
}
