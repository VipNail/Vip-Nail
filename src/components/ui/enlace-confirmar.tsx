"use client";
// Botón pequeño (con aspecto de enlace o pastilla) que pide confirmación antes de enviar.
import { useFormStatus } from "react-dom";

export function EnlaceConfirmar({ pregunta, className, children }: { pregunta: string; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-50`}
      onClick={(e) => {
        if (!window.confirm(pregunta)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
