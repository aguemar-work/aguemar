import { Badge } from "@/components/ui/badge";
import { etiquetaAcceso, type EstadoAcceso } from "@/lib/acceso-empresa";
import { formatearFecha } from "@/lib/format";

/** Estado del acceso de una empresa a su workspace (HU 2.1); el título muestra la fecha exacta. */
export function EtiquetaAcceso({ estado, ultimoIngreso }: { estado: EstadoAcceso; ultimoIngreso?: string | null }) {
  const { texto, tono } = etiquetaAcceso(estado);
  if (tono === "neutro") return <span className="text-xs text-muted-foreground">{texto}</span>;
  return (
    <Badge variant={tono} dot title={ultimoIngreso ? `Último ingreso: ${formatearFecha(ultimoIngreso)}` : undefined}>
      {texto}
    </Badge>
  );
}
