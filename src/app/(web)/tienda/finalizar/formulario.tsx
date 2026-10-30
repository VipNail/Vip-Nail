"use client";
import { useActionState, useState } from "react";
import { Aviso, Boton, Campo, Casilla } from "@/components/ui/campo";
import { crearPedido, type EstadoFormulario } from "@/features/tienda/acciones-web";

type Metodo = { id: string; nombre: string; tipo: "envio" | "recogida"; descripcion: string | null; coste: string };
type Pago = { id: string; nombre: string };

export function FormularioFinalizar({ metodos, pagos, totales }: { metodos: Metodo[]; pagos: Pago[]; totales: Record<string, string> }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearPedido, {});
  const [metodo, setMetodo] = useState(metodos[0]?.id ?? "");
  const actual = metodos.find((m) => m.id === metodo);

  return (
    <form action={accion} className="flex flex-col gap-6">
      {estado.error && <Aviso>{estado.error}</Aviso>}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-medium">Tus datos</legend>
        <Campo etiqueta="Nombre y apellidos" name="nombre" autoComplete="name" required maxLength={160} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Email" name="email" type="email" autoComplete="email" required maxLength={191} />
          <Campo etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" required maxLength={32} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-medium">Entrega</legend>
        {metodos.map((m) => (
          <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-borde bg-superficie p-3 has-[:checked]:border-marca">
            <input type="radio" name="metodoEnvioId" value={m.id} checked={metodo === m.id} onChange={() => setMetodo(m.id)} className="mt-1 size-5" />
            <span className="flex flex-1 flex-col">
              <span className="font-medium">{m.nombre}</span>
              {m.descripcion && <span className="text-sm text-texto-suave">{m.descripcion}</span>}
            </span>
            <span className="font-medium">{m.coste}</span>
          </label>
        ))}
      </fieldset>

      {actual?.tipo === "envio" && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-medium">Dirección de entrega</legend>
          <Campo etiqueta="Dirección (calle, número, piso)" name="direccion" autoComplete="street-address" required maxLength={200} />
          <div className="grid grid-cols-2 gap-4">
            <Campo etiqueta="Código postal" name="cp" inputMode="numeric" autoComplete="postal-code" required maxLength={5} pattern="\d{5}" />
            <Campo etiqueta="Población" name="ciudad" autoComplete="address-level2" required maxLength={100} />
          </div>
          <Campo etiqueta="Provincia" name="provincia" autoComplete="address-level1" required maxLength={100} />
        </fieldset>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Notas para el pedido (opcional)</span>
        <textarea name="notas" maxLength={1000} className="min-h-20 rounded-lg border border-borde bg-superficie px-3 py-2 text-base" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-medium">Pago</legend>
        {pagos.map((p, i) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-borde bg-superficie p-3 has-[:checked]:border-marca">
            <input type="radio" name="pago" value={p.id} defaultChecked={i === 0} className="size-5" />
            <span className="font-medium">{p.nombre}</span>
          </label>
        ))}
      </fieldset>

      <section className="flex flex-col gap-1 rounded-xl border border-borde p-4">
        <div className="flex justify-between">
          <span>Productos</span>
          <span>{totales.productos}</span>
        </div>
        <div className="flex justify-between">
          <span>Entrega</span>
          <span>{actual?.coste}</span>
        </div>
        <div className="mt-2 flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{actual ? totales[actual.id] : ""}</span>
        </div>
        <span className="text-xs text-texto-suave">IVA incluido</span>
      </section>

      <div className="flex flex-col gap-1">
        {/* DEBT: enlazar las condiciones de venta y la política de privacidad cuando diseño las entregue. */}
        <Casilla name="acepto" required etiqueta="He leído y acepto las condiciones de venta y la política de privacidad" />
        <Casilla name="novedades" etiqueta="Quiero recibir novedades y promociones (opcional)" />
      </div>

      <Boton type="submit" disabled={enviando}>
        {enviando ? "Un momento…" : "Pagar"}
      </Boton>
    </form>
  );
}
