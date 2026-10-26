"use client";
import { useFormStatus } from "react-dom";
import { BotonSecundario } from "@/components/ui/campo";

/** Botón de envío que, si se le pasa una pregunta, pide confirmación antes. */
export function BotonConfirmar({ pregunta, children }: { pregunta?: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <BotonSecundario
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto"
      onClick={(e) => {
        if (pregunta && !window.confirm(pregunta)) e.preventDefault();
      }}
    >
      {pending ? "Un momento…" : children}
    </BotonSecundario>
  );
}
