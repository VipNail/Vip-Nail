import type { Metadata } from "next";
import { Suspense } from "react";
import { seccionesParaRol } from "@/features/crm/menu";
import { NOMBRE_ROL } from "@/lib/permisos";
import { exigirEquipo } from "@/lib/sesion";
import { MenuCrm } from "./menu";

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s · CRM VIP Nails" },
  robots: { index: false, follow: false },
};

export default function LayoutCrm({ children }: LayoutProps<"/crm">) {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <Suspense fallback={<div className="h-14 bg-marca lg:h-screen lg:w-64" />}>
        <Menu />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<p className="p-4 text-sm text-texto-suave">Cargando…</p>}>{children}</Suspense>
      </div>
    </div>
  );
}

async function Menu() {
  const yo = await exigirEquipo("crm.ver");
  return <MenuCrm secciones={seccionesParaRol(yo.rol)} nombre={yo.nombre} rol={NOMBRE_ROL[yo.rol]} />;
}
