import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BotonSalir } from "./salir";

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s · CRM VIP Nails" },
  robots: { index: false, follow: false },
};

// Esqueleto del panel. El menú completo llega en la semana 1 (layout del CRM).
export default function LayoutCrm({ children }: LayoutProps<"/crm">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between bg-marca px-4 py-3 text-sobre-marca">
        <Link href="/crm" className="font-semibold tracking-wide">
          VIP Nails <span className="text-acento">·</span> CRM
        </Link>
        <BotonSalir />
      </header>
      <Suspense fallback={<p className="p-4 text-sm text-texto-suave">Cargando…</p>}>{children}</Suspense>
    </div>
  );
}
