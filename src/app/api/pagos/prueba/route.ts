// «Aviso» del proveedor de pagos de PRUEBAS. Solo existe fuera de producción.
// Comprueba la firma y el importe, marca el pago y devuelve a la clienta a su pedido.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedido } from "@/db/schema";
import { confirmarPago } from "@/features/pagos/confirmar";
import { pagosDePrueba, verificarPrueba } from "@/features/pagos/proveedores";

export async function POST(request: Request) {
  if (!pagosDePrueba()) return new Response("No disponible", { status: 404 });
  const datos = await request.formData();
  const pedidoId = String(datos.get("pedido") ?? "");
  const importe = Number(datos.get("importe"));
  const resultado = String(datos.get("resultado") ?? "");
  const firma = String(datos.get("firma") ?? "");

  if (!Number.isInteger(importe) || !verificarPrueba(pedidoId, importe, resultado, firma)) {
    return new Response("Firma no válida", { status: 400 });
  }
  const [p] = await db
    .select({ numero: pedido.numero, token: pedido.tokenAcceso })
    .from(pedido)
    .where(eq(pedido.id, pedidoId))
    .limit(1);
  if (!p) return new Response("No existe", { status: 404 });

  let aviso = "cancelado";
  if (resultado === "ok") {
    const r = await confirmarPago({ pedidoId, importe, metodo: "prueba", ref: `PRUEBA-${Date.now()}` });
    if (r === "importe") return new Response("Importe no válido", { status: 400 });
    aviso = r === "pagado" || r === "ya-pagado" ? "pagado" : "error";
  }
  // Redirección relativa: detrás del proxy de Hostinger request.url no lleva el dominio real.
  const destino = `/tienda/pedido?n=${encodeURIComponent(p.numero)}&t=${encodeURIComponent(p.token)}&aviso=${aviso}`;
  return new Response(null, { status: 303, headers: { Location: destino } });
}
