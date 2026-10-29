"use client";
// Menú del CRM. Móvil: barra superior con botón «Menú» que abre un panel lateral.
// Escritorio (lg): barra lateral fija. Las secciones llegan ya filtradas por rol desde el servidor.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { IconoMenu, SeccionCrm } from "@/features/crm/menu";
import { BotonSalir } from "./salir";

type Props = { secciones: SeccionCrm[]; nombre: string; rol: string };

export function MenuCrm({ secciones, nombre, rol }: Props) {
  const [abierto, setAbierto] = useState(false);

  // Escape cierra el panel y la página de fondo no se desplaza mientras está abierto.
  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alPulsar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflow;
    };
  }, [abierto]);

  const cerrar = () => setAbierto(false);

  return (
    <>
      {/* Barra superior (móvil y tablet) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-marca px-2 text-sobre-marca lg:hidden">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-expanded={abierto}
          aria-controls="menu-crm"
          className="flex h-11 items-center gap-2 rounded-lg px-3 font-medium"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menú
        </button>
        <Link href="/crm" className="px-3 font-semibold tracking-wide">
          VIP Nails <span className="text-acento">·</span> CRM
        </Link>
      </header>

      {/* Fondo oscuro del panel en móvil */}
      {abierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={cerrar}
          className="fixed inset-0 z-40 bg-texto/50 lg:hidden"
        />
      )}

      <aside
        id="menu-crm"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-marca text-sobre-marca transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0 lg:transition-none ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menú del CRM"
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/crm" onClick={cerrar} className="font-semibold tracking-wide">
            VIP Nails <span className="text-acento">·</span> CRM
          </Link>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar menú"
            className="flex size-11 items-center justify-center rounded-lg lg:hidden"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="flex flex-col gap-1">
            {secciones.map((s) => (
              <li key={s.href}>
                <Enlace seccion={s} alPulsar={cerrar} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-sobre-marca/20 px-4 py-4 text-sm">
          <p className="font-medium">{nombre}</p>
          <p className="text-sobre-marca/70">{rol}</p>
          <div className="mt-3">
            <BotonSalir />
          </div>
        </div>
      </aside>
    </>
  );
}

function Enlace({ seccion, alPulsar }: { seccion: SeccionCrm; alPulsar: () => void }) {
  const ruta = usePathname();
  const activa =
    seccion.href === "/crm" ? ruta === "/crm" : ruta === seccion.href || ruta.startsWith(`${seccion.href}/`);
  const base = "flex h-12 items-center gap-3 rounded-lg px-3";

  if (!seccion.disponible) {
    return (
      <span className={`${base} cursor-default text-sobre-marca/50`} aria-disabled>
        <Icono nombre={seccion.icono} />
        <span className="flex-1">{seccion.nombre}</span>
        <span className="rounded-full border border-sobre-marca/30 px-2 text-xs">pronto</span>
      </span>
    );
  }
  return (
    <Link
      href={seccion.href}
      onClick={alPulsar}
      aria-current={activa ? "page" : undefined}
      className={`${base} ${activa ? "bg-sobre-marca text-marca font-medium" : "hover:bg-marca-hover"}`}
    >
      <Icono nombre={seccion.icono} />
      <span className="flex-1">{seccion.nombre}</span>
    </Link>
  );
}

// Iconos de trazo simples (24×24), sin librerías.
const TRAZOS: Record<IconoMenu, string> = {
  inicio: "M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z",
  agenda: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4",
  reservas: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  clientas: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
  pedidos: "M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0",
  productos: "M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8",
  cursos: "M3 9l9-4 9 4-9 4zM7 11v5c0 1.5 2.2 3 5 3s5-1.5 5-3v-5",
  web: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM4 12h16M12 4c2.2 2.2 3 5 3 8s-.8 5.8-3 8c-2.2-2.2-3-5-3-8s.8-5.8 3-8z",
  ventas: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  equipo: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.8c2 .7 3.5 2.6 3.5 5.2",
};

function Icono({ nombre }: { nombre: IconoMenu }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
