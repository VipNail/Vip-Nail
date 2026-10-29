// Componentes base provisionales; se rehacen con el design system de diseño.
import Link from "next/link";
import type { ComponentProps } from "react";

export function Campo({ etiqueta, ...props }: ComponentProps<"input"> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{etiqueta}</span>
      <input
        {...props}
        className="h-12 rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-marca"
      />
    </label>
  );
}

export function Boton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`h-12 rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover disabled:opacity-50 ${className}`}
    />
  );
}

export function Aviso({ children, tipo = "error" }: { children: React.ReactNode; tipo?: "error" | "ok" }) {
  const color = tipo === "error" ? "border border-error bg-superficie text-error" : "border border-marca bg-superficie text-marca";
  return (
    <p role="alert" className={`rounded-lg px-3 py-2 text-sm ${color}`}>
      {children}
    </p>
  );
}

export function Selector({
  etiqueta,
  children,
  ...props
}: ComponentProps<"select"> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{etiqueta}</span>
      <select
        {...props}
        className="h-12 rounded-lg border border-borde bg-superficie px-3 text-base outline-none focus:border-marca"
      >
        {children}
      </select>
    </label>
  );
}

/** Botón secundario (borde, sin relleno). */
export function BotonSecundario({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`h-12 rounded-full border border-marca px-6 font-medium text-marca hover:bg-superficie disabled:opacity-50 ${className}`}
    />
  );
}

export function AreaTexto({ etiqueta, ...props }: ComponentProps<"textarea"> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{etiqueta}</span>
      <textarea
        {...props}
        className="min-h-24 rounded-lg border border-borde bg-superficie px-3 py-2 text-base outline-none focus:border-marca"
      />
    </label>
  );
}

/** Casilla con texto pulsable de 44 px de alto (cómoda en el móvil). */
export function Casilla({ etiqueta, ...props }: ComponentProps<"input"> & { etiqueta: React.ReactNode }) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-base">
      <input type="checkbox" {...props} className="size-5 accent-[var(--color-marca)]" />
      <span>{etiqueta}</span>
    </label>
  );
}

/** Tarjeta enlazada para menús de sección. */
export function TarjetaEnlace({ href, titulo, texto }: { href: string; titulo: string; texto: string }) {
  return (
    <Link href={href} className="flex flex-col gap-1 rounded-xl border border-borde bg-superficie p-4 hover:border-marca">
      <span className="font-medium text-marca">{titulo}</span>
      <span className="text-sm text-texto-suave">{texto}</span>
    </Link>
  );
}
