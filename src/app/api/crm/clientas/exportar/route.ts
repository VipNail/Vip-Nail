// Descarga de todos los datos de una clienta (RGPD: derecho de acceso y portabilidad).
// Solo administración. Se responde con un JSON descargable.
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { actividad, staff } from "@/db/schema";
import { datosParaExportar } from "@/features/clientas/consultas";
import { auth } from "@/lib/auth";
import { tienePermiso } from "@/lib/permisos";

export async function GET(request: Request) {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (!sesion) return new Response("No autorizado", { status: 401 });
  const [yo] = await db
    .select({ rol: staff.rol, activo: staff.activo })
    .from(staff)
    .where(eq(staff.userId, sesion.user.id))
    .limit(1);
  if (!yo?.activo || !tienePermiso(yo.rol, "clientas.rgpd")) return new Response("Sin permiso", { status: 403 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const datos = id.length === 26 ? await datosParaExportar(id) : null;
  if (!datos) return new Response("No encontrada", { status: 404 });

  await db.insert(actividad).values({
    userId: sesion.user.id,
    tipo: "cliente.exportar",
    descripcion: `Datos exportados (RGPD): ${datos.clienta.nombre}`.slice(0, 255),
  });

  const nombre = datos.clienta.nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  return new Response(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="datos-${nombre}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
