// Logo oficial (claude/diseno/logo/). Mínimo legible: 96 px de ancho.
// Proporción 630 × 558. Como <img> sale en negro; para versión clara sobre verde
// habrá que insertarlo en línea (pendiente cuando haya cabecera oscura).
type Props = { ancho?: number; className?: string; prioridad?: boolean };

export function Logo({ ancho = 140, className = "", prioridad = false }: Props) {
  const alto = Math.round((ancho * 558) / 630);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG ligero, no necesita optimización
    <img
      src="/marca/logo-vipnails.svg"
      alt="VIP Nail by Nadya Zhuravel — Studio & School"
      width={ancho}
      height={alto}
      className={className}
      fetchPriority={prioridad ? "high" : undefined}
    />
  );
}
