// Cómo se muestra cada estado de cita en el CRM.
export const ESTADO_CITA = {
  confirmada: { texto: "Confirmada", clase: "border-marca text-marca" },
  completada: { texto: "Hecha", clase: "border-borde text-texto-suave" },
  no_vino: { texto: "No vino", clase: "border-error text-error" },
  cancelada: { texto: "Cancelada", clase: "border-borde text-texto-suave" },
} as const;
