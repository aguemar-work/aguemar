import { Badge } from "@/components/ui/badge";
import type { EstadoCotizacion, EstadoFinalFicha } from "@/types/database";

const COTIZACION: Record<EstadoCotizacion, { texto: string; variant: "default" | "warn" | "ok" | "danger" }> = {
  borrador: { texto: "Borrador", variant: "default" },
  enviada: { texto: "Enviada", variant: "warn" },
  aceptada: { texto: "Aceptada", variant: "ok" },
  rechazada: { texto: "Rechazada", variant: "danger" },
  vencida: { texto: "Vencida", variant: "danger" },
};

const FICHA: Record<EstadoFinalFicha, { texto: string; variant: "ok" | "warn" | "danger" }> = {
  operativo: { texto: "Operativo", variant: "ok" },
  operativo_observaciones: { texto: "Con observaciones", variant: "warn" },
  requiere_reparacion: { texto: "Requiere reparación", variant: "danger" },
};

export function EtiquetaCotizacion({ estado }: { estado: EstadoCotizacion }) {
  const e = COTIZACION[estado];
  return (
    <Badge variant={e.variant} dot>
      {e.texto}
    </Badge>
  );
}

export function EtiquetaFicha({ estado }: { estado: EstadoFinalFicha }) {
  const e = FICHA[estado];
  return (
    <Badge variant={e.variant} dot>
      {e.texto}
    </Badge>
  );
}
