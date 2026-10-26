"use server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { crearMiembroEquipo, hayAdmin } from "@/features/equipo/alta";

const Esquema = z.object({
  token: z.string().min(1),
  nombre: z.string().trim().min(2, "Pon tu nombre."),
  email: z.email("Email no válido."),
  password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres."),
});

export type EstadoInstalar = { error?: string; ok?: boolean };

function tokenValido(recibido: string) {
  const esperado = process.env.INSTALAR_TOKEN ?? "";
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  return esperado.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export async function instalar(_: EstadoInstalar, datos: FormData): Promise<EstadoInstalar> {
  const r = Esquema.safeParse(Object.fromEntries(datos));
  if (!r.success) return { error: r.error.issues[0]?.message ?? "Revisa los datos." };
  if (!tokenValido(r.data.token)) return { error: "Código de instalación incorrecto." };
  if (await hayAdmin()) return { error: "La instalación ya está hecha." };

  try {
    await crearMiembroEquipo({
      nombre: r.data.nombre,
      email: r.data.email,
      password: r.data.password,
      rol: "admin",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la cuenta." };
  }
  return { ok: true };
}
