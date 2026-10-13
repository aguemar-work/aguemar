import { Badge } from "@/components/ui/badge";
import { infoEstado, rotuloArea } from "@/lib/areas";
import type { Area, EstadoTrabajo } from "@/types/database";

export function EtiquetaArea({ area, className }: { area: Area; className?: string }) {
  return (
    <span className={`font-mono text-xs text-mint-ink dark:text-mint ${className ?? ""}`}>{rotuloArea(area)}</span>
  );
}

export function EtiquetaEstadoTrabajo({ estado }: { estado: EstadoTrabajo }) {
  const e = infoEstado(estado);
  return (
    <Badge variant={e.variant} dot>
      {e.etiqueta}
    </Badge>
  );
}
