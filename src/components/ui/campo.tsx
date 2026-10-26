// Componentes base provisionales; se rehacen con el design system de diseño.
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
