// Secciones del CRM (presupuesto: bloque CRM) y el permiso que hace falta para verlas.
// El menú solo muestra lo que el rol puede ver; cada página vuelve a comprobarlo en servidor.
import type { Rol } from "@/db/schema";
import { tienePermiso, type Permiso } from "@/lib/permisos";

export type IconoMenu =
  | "inicio"
  | "agenda"
  | "clientas"
  | "pedidos"
  | "productos"
  | "cursos"
  | "web"
  | "ventas"
  | "equipo";

export type SeccionCrm = {
  href: string;
  nombre: string;
  icono: IconoMenu;
  permiso: Permiso;
  /** false = aún no construida: sale en el menú como «pronto», sin enlace. */
  disponible: boolean;
};

export const SECCIONES_CRM: readonly SeccionCrm[] = [
  { href: "/crm", nombre: "Inicio", icono: "inicio", permiso: "crm.ver", disponible: true },
  { href: "/crm/agenda", nombre: "Agenda", icono: "agenda", permiso: "agenda.ver", disponible: false },
  { href: "/crm/clientas", nombre: "Clientas", icono: "clientas", permiso: "clientas.ver", disponible: false },
  { href: "/crm/pedidos", nombre: "Pedidos", icono: "pedidos", permiso: "pedidos.gestionar", disponible: false },
  { href: "/crm/productos", nombre: "Productos", icono: "productos", permiso: "productos.gestionar", disponible: false },
  { href: "/crm/cursos", nombre: "Cursos", icono: "cursos", permiso: "cursos.gestionar", disponible: false },
  { href: "/crm/web", nombre: "Web", icono: "web", permiso: "web.editar", disponible: false },
  { href: "/crm/ventas", nombre: "Ventas", icono: "ventas", permiso: "ventas.ver", disponible: false },
  { href: "/crm/equipo", nombre: "Equipo", icono: "equipo", permiso: "equipo.gestionar", disponible: true },
];

export function seccionesParaRol(rol: Rol): SeccionCrm[] {
  return SECCIONES_CRM.filter((s) => tienePermiso(rol, s.permiso));
}
