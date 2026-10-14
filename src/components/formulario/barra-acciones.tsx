"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePanelLateral } from "@/components/panel/panel-lateral";
import { cn } from "@/lib/utils";

interface BarraAccionesProps {
  guardando: boolean;
  textoGuardar?: string;
  hrefCancelar: string;
  /** Mensaje de error general del formulario (no asociado a un campo). */
  error?: string;
}

/** Guardar y cancelar. Dentro de un panel lateral queda fija abajo y "Cancelar" cierra el panel. */
export function BarraAcciones({ guardando, textoGuardar = "Guardar", hrefCancelar, error }: BarraAccionesProps) {
  const panel = usePanelLateral();
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between",
        panel && "sticky bottom-0 -mx-4 bg-background px-4 pb-4 sm:-mx-8 sm:px-8",
      )}
    >
      <p role={error ? "alert" : undefined} className="text-sm text-danger">
        {error}
      </p>
      <div className="flex gap-2 sm:justify-end">
        {panel ? (
          <Button type="button" variant="outline" onClick={() => panel.cerrar()}>
            Cancelar
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={hrefCancelar}>Cancelar</Link>
          </Button>
        )}
        <Button type="submit" variant="mint" disabled={guardando}>
          {guardando ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {guardando ? "Guardando…" : textoGuardar}
        </Button>
      </div>
    </div>
  );
}
