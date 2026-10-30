"use client";
import { useActionState, useState } from "react";
import { Aviso, BotonSecundario } from "@/components/ui/campo";
import { generarEnlaceAcceso, type EstadoEnlace } from "@/features/cuenta/acciones";

/** Genera el enlace de la zona de alumna y lo deja listo para copiar o mandar por WhatsApp. */
export function EnlaceAlumna({ clienteId, telefono, nombre, tieneCuenta }: { clienteId: string; telefono: string | null; nombre: string; tieneCuenta: boolean }) {
  const [estado, accion, enviando] = useActionState<EstadoEnlace, FormData>(generarEnlaceAcceso, {});
  const [copiado, setCopiado] = useState(false);
  const texto = estado.enlace
    ? `Hola ${nombre.split(" ")[0]}, este es tu enlace para ${tieneCuenta ? "cambiar tu contraseña" : "crear tu contraseña"} y entrar a tus cursos de VIP Nail School (vale 7 días y solo una vez): ${estado.enlace}`
    : "";
  const tel = telefono && /^\d{9}$/.test(telefono) ? `34${telefono}` : telefono?.replace(/\D/g, "");

  return (
    <div className="flex flex-col gap-3">
      {estado.error && <Aviso>{estado.error}</Aviso>}
      {estado.enlace ? (
        <div className="flex flex-col gap-2">
          <p className="break-all rounded-lg border border-borde bg-fondo px-3 py-2 font-mono text-xs">{estado.enlace}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <BotonSecundario
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(texto);
                  setCopiado(true);
                } catch {
                  setCopiado(false);
                }
              }}
            >
              {copiado ? "Copiado ✓" : "Copiar mensaje"}
            </BotonSecundario>
            {tel && (
              <a
                href={`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center rounded-full bg-marca px-6 font-medium text-sobre-marca hover:bg-marca-hover"
              >
                Enviar por WhatsApp
              </a>
            )}
          </div>
          <p className="text-xs text-texto-suave">Vale 7 días y solo una vez. Si generas otro, este deja de valer.</p>
        </div>
      ) : (
        <form action={accion}>
          <input type="hidden" name="clienteId" value={clienteId} />
          <BotonSecundario type="submit" disabled={enviando}>
            {enviando ? "Un momento…" : tieneCuenta ? "Enlace para cambiar su contraseña" : "Enlace para crear su contraseña"}
          </BotonSecundario>
        </form>
      )}
    </div>
  );
}
