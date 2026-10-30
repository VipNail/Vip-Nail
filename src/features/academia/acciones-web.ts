"use server";
// Inscripción desde la web: comprar un curso online o reservar plaza en uno presencial.
// Se crea un pedido «sin envío» y se va a la pasarela; el acceso o la plaza se confirman
// SOLO cuando llega el aviso firmado del pago (features/pagos/confirmar.ts).
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accesoCurso, convocatoria, curso, pedido, pedidoLinea, plaza } from "@/db/schema";
import { buscarOCrearCliente, normalizarTelefono } from "@/features/clientas/buscar";
import { proveedor } from "@/features/pagos/proveedores";
import { siguienteNumeroPedido } from "@/features/tienda/numeracion";
import { importeReserva, MINUTOS_RESERVA, ocupa, plazasLibres } from "./logica";

export type EstadoFormulario = { error?: string };

const Esquema = z.object({
  cursoId: z.string().length(26).or(z.literal("")).default(""),
  convocatoriaId: z.string().length(26).or(z.literal("")).default(""),
  modalidad: z.enum(["senal", "total"]).default("total"),
  nombre: z.string().trim().min(3, "Pon tu nombre y apellidos.").max(160),
  email: z.email("Pon un email válido: ahí te mandamos la confirmación.").max(191),
  telefono: z.string().trim().min(6, "Pon tu teléfono.").max(32),
  pago: z.string().max(20),
});

class Rechazo extends Error {}
const fecha = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" });

export async function crearInscripcion(_: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const r = Esquema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  const d = r.data;
  if (formData.get("acepto") !== "on") return { error: "Tienes que aceptar las condiciones." };
  const telefono = normalizarTelefono(d.telefono);
  if (!telefono) return { error: "Teléfono no válido." };
  const pasarela = proveedor(d.pago);
  if (!pasarela) return { error: "Ahora mismo no se pueden hacer pagos online. Inténtalo más tarde o escríbenos." };

  const token = randomBytes(24).toString("base64url");
  let creado: { id: string; numero: string; total: number };
  try {
    creado = await db.transaction(async (tx) => {
      const ahora = new Date();
      let linea: { tipo: "curso" | "plaza"; cursoId: string; referencia: string; nombre: string; precio: number; tipoIva: number };
      let convId: string | null = null;

      if (d.convocatoriaId) {
        // Presencial: se bloquea la convocatoria para no vender más plazas de las que hay.
        const [c] = await tx
          .select({ conv: convocatoria, curso })
          .from(convocatoria)
          .innerJoin(curso, eq(curso.id, convocatoria.cursoId))
          .where(eq(convocatoria.id, d.convocatoriaId))
          .for("update");
        if (!c || !c.curso.visible || c.conv.estado !== "abierta" || c.conv.inicio <= ahora) throw new Rechazo("Esas fechas ya no admiten inscripciones.");
        const plazas = await tx.select({ estado: plaza.estado, caducaAt: plaza.caducaAt, clienteId: plaza.clienteId }).from(plaza).where(eq(plaza.convocatoriaId, c.conv.id));
        if (plazasLibres(c.conv.plazas, plazas, ahora) <= 0) throw new Rechazo("Lo sentimos: se acaban de ocupar las últimas plazas.");
        const importe = importeReserva(c.curso.precio, c.conv.precioSenal, d.modalidad);
        const esSenal = importe < c.curso.precio;
        linea = {
          tipo: "plaza",
          cursoId: c.curso.id,
          referencia: "PLAZA",
          nombre: `${esSenal ? "Señal · " : ""}${c.curso.titulo} · ${fecha.format(c.conv.inicio)}`.slice(0, 200),
          precio: importe,
          tipoIva: c.curso.tipoIva,
        };
        convId = c.conv.id;
        const cl = await buscarOCrearCliente(tx, { nombre: d.nombre, telefono: d.telefono, email: d.email, origen: "web", consiente: formData.get("novedades") === "on" });
        if (plazas.some((p) => p.clienteId === cl.id && ocupa(p, ahora))) throw new Rechazo("Ya tienes una plaza en estas fechas.");
        return await crear(tx, cl.id, linea, convId, esSenal ? "senal" : "total");
      }

      const [c] = await tx.select().from(curso).where(and(eq(curso.id, d.cursoId), eq(curso.visible, true), eq(curso.tipo, "online"))).limit(1);
      if (!c) throw new Rechazo("Ese curso ya no está disponible.");
      linea = { tipo: "curso", cursoId: c.id, referencia: "CURSO", nombre: c.titulo, precio: c.precio, tipoIva: c.tipoIva };
      const cl = await buscarOCrearCliente(tx, { nombre: d.nombre, telefono: d.telefono, email: d.email, origen: "web", consiente: formData.get("novedades") === "on" });
      const [ya] = await tx.select({ id: accesoCurso.id }).from(accesoCurso).where(and(eq(accesoCurso.clienteId, cl.id), eq(accesoCurso.cursoId, c.id))).limit(1);
      if (ya) throw new Rechazo("Ya tienes este curso. Si no puedes entrar, escríbenos.");
      return await crear(tx, cl.id, linea, null, "total");

      async function crear(t: typeof tx, clienteId: string, l: typeof linea, conv: string | null, modalidad: "senal" | "total") {
        const numero = await siguienteNumeroPedido(t);
        const [p] = await t
          .insert(pedido)
          .values({
            numero,
            clienteId,
            nombre: d.nombre,
            email: d.email.toLowerCase(),
            telefono: telefono!,
            envioNombre: "Inscripción a curso",
            envioTipo: "sin_envio",
            subtotal: l.precio,
            envio: 0,
            total: l.precio,
            metodoPago: pasarela!.id,
            tokenAcceso: token,
          })
          .$returningId();
        await t.insert(pedidoLinea).values({ pedidoId: p.id, tipo: l.tipo, cursoId: l.cursoId, referencia: l.referencia, nombre: l.nombre, precio: l.precio, precioOriginal: l.precio, tipoIva: l.tipoIva, cantidad: 1 });
        if (conv) {
          await t.insert(plaza).values({
            convocatoriaId: conv,
            clienteId,
            estado: "reservada_pendiente",
            modalidad,
            pedidoId: p.id,
            caducaAt: new Date(Date.now() + MINUTOS_RESERVA * 60_000),
          });
        }
        return { id: p.id, numero, total: l.precio };
      }
    });
  } catch (e) {
    if (e instanceof Rechazo) return { error: e.message };
    throw e;
  }

  const { url } = await pasarela.iniciar({ pedidoId: creado.id, numero: creado.numero, total: creado.total, token });
  redirect(url);
}
