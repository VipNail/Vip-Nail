// Permisos por rol, definidos en código (ARQUITECTURA §4). Se comprueban SIEMPRE en servidor.
import type { Rol } from "@/db/schema";

export const PERMISOS = [
  "crm.ver",
  "agenda.ver",
  "agenda.gestionar",
  "clientas.ver",
  "clientas.gestionar",
  "pedidos.gestionar",
  "productos.gestionar",
  "cursos.gestionar",
  "web.editar",
  "ventas.ver",
  "equipo.gestionar",
] as const;
export type Permiso = (typeof PERMISOS)[number];

const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
  admin: PERMISOS,
  recepcion: [
    "crm.ver",
    "agenda.ver",
    "agenda.gestionar",
    "clientas.ver",
    "clientas.gestionar",
    "pedidos.gestionar",
  ],
  profesional: ["crm.ver", "agenda.ver", "clientas.ver"],
  formadora: ["crm.ver", "cursos.gestionar", "clientas.ver"],
};

export function tienePermiso(rol: Rol, permiso: Permiso): boolean {
  return PERMISOS_POR_ROL[rol].includes(permiso);
}

export const NOMBRE_ROL: Record<Rol, string> = {
  admin: "Administración",
  recepcion: "Recepción",
  profesional: "Profesional",
  formadora: "Formadora",
};

/** Qué puede hacer cada rol, en lenguaje llano (para el formulario de equipo). */
export const DESCRIPCION_ROL: Record<Rol, string> = {
  admin: "Todo el CRM, incluida la gestión del equipo.",
  recepcion: "Agenda, clientas y pedidos.",
  profesional: "Ve la agenda y las fichas de clientas.",
  formadora: "Cursos y fichas de alumnas.",
};
