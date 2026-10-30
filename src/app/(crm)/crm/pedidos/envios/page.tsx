import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, BotonSecundario } from "@/components/ui/campo";
import { guardarMetodoEnvio } from "@/features/tienda/acciones-pedidos";
import { metodosEnvio } from "@/features/tienda/cesta";
import { exigirEquipo } from "@/lib/sesion";

export const metadata: Metadata = { title: "Formas de entrega" };

const aTexto = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ","));
const entrada = "h-11 rounded-lg border border-borde bg-superficie px-3 text-base";

export default async function Envios({ searchParams }: PageProps<"/crm/pedidos/envios">) {
  await exigirEquipo("productos.gestionar");
  const { aviso } = await searchParams;
  const metodos = await metodosEnvio(false);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      <div>
        <Link href="/crm/pedidos" className="text-sm text-texto-suave underline-offset-4 hover:underline">
          ← Pedidos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-marca">Formas de entrega</h1>
        <p className="text-sm text-texto-suave">
          Importes provisionales hasta que Nadya confirme sus condiciones de envío.
        </p>
      </div>
      {aviso === "guardado" && <Aviso tipo="ok">Guardado.</Aviso>}
      {aviso === "error" && <Aviso>Revisa los importes (por ejemplo: 4,95).</Aviso>}

      {metodos.map((m) => (
        <form key={m.id} action={guardarMetodoEnvio} className="flex flex-col gap-3 rounded-xl border border-borde p-4">
          <input type="hidden" name="id" value={m.id} />
          <p className="text-sm text-texto-suave">{m.tipo === "recogida" ? "Recogida en el estudio" : "Envío a domicilio"}</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Nombre (lo ve la clienta)</span>
            <input name="nombre" defaultValue={m.nombre} required maxLength={120} className={entrada} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Explicación</span>
            <input name="descripcion" defaultValue={m.descripcion ?? ""} maxLength={255} className={entrada} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Precio (€)</span>
              <input name="precio" defaultValue={aTexto(m.precio)} inputMode="decimal" className={entrada} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Gratis desde (€)</span>
              <input name="gratisDesde" defaultValue={aTexto(m.gratisDesde)} inputMode="decimal" placeholder="Vacío = nunca" className={entrada} />
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" name="activo" defaultChecked={m.activo} className="size-5" /> Disponible en la tienda
          </label>
          <BotonSecundario type="submit">Guardar</BotonSecundario>
        </form>
      ))}
    </main>
  );
}
