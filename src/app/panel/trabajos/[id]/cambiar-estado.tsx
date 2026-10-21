"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { ESTADOS_TRABAJO } from "@/lib/areas";
import type { EstadoTrabajo } from "@/types/database";
import { cambiarEstadoTrabajo } from "../acciones";

export function CambiarEstado({ id, estado }: { id: string; estado: EstadoTrabajo }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="estado-trabajo" className="text-xs font-medium text-muted-foreground">
        Estado
      </label>
      <Select
        id="estado-trabajo"
        value={estado}
        disabled={pendiente}
        className="h-9 w-44"
        onChange={(e) =>
          iniciar(async () => {
            const r = await cambiarEstadoTrabajo(id, e.target.value as EstadoTrabajo);
            if (!r.ok) avisoError(r.error);
            else if (r.data.cotizacion) {
              const cot = r.data.cotizacion;
              toast.success("Trabajo cancelado.", {
                description: `${cot.numero ?? "Su cotización"} sigue aceptada y con deuda. ¿Quieres anularla?`,
                duration: 12000,
                action: { label: "Ir a la cotización", onClick: () => router.push(`/panel/cotizaciones/${cot.id}`) },
              });
            } else toast.success("Estado actualizado.");
          })
        }
      >
        {ESTADOS_TRABAJO.map((s) => (
          <option key={s.valor} value={s.valor}>
            {s.etiqueta}
          </option>
        ))}
      </Select>
      {pendiente ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
    </div>
  );
}
