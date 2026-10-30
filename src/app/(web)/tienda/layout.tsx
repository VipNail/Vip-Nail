import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { leerCesta } from "@/features/tienda/cesta";

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
          <Suspense fallback={<EnlaceCesta n={0} />}>
            <IconoCesta />
          </Suspense>
        </div>
      </header>
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<p className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-texto-suave">Cargando…</p>}>{children}</Suspense>
      </div>
      <footer className="mt-10 border-t border-borde px-4 py-6 text-center text-sm text-texto-suave">
        VIP Nail Studio &amp; School · Tienda en pruebas: los pagos son simulados.
      </footer>
    </div>
  );
}

async function IconoCesta() {
  const n = (await leerCesta()).reduce((t, [, c]) => t + c, 0);
  return <EnlaceCesta n={n} />;
}

function EnlaceCesta({ n }: { n: number }) {
  return (
    <Link href="/tienda/cesta" aria-label={`Cesta, ${n} artículos`} className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-borde">
      <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0" />
      </svg>
      {n > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-marca px-1 text-xs font-medium text-sobre-marca">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
