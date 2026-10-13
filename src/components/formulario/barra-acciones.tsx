"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarraAccionesProps {
  guardando: boolean;
  textoGuardar?: string;
  hrefCancelar: string;
  /** Mensaje de error general del formulario (no asociado a un campo). */
  error?: string;
}

export function BarraAcciones({ guardando, textoGuardar = "Guardar", hrefCancelar, error }: BarraAccionesProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p role={error ? "alert" : undefined} className="text-sm text-danger">
        {error}
      </p>
      <div className="flex gap-2 sm:justify-end">
        <Button asChild variant="outline">
          <Link href={hrefCancelar}>Cancelar</Link>
        </Button>
        <Button type="submit" variant="mint" disabled={guardando}>
          {guardando ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {guardando ? "Guardando…" : textoGuardar}
        </Button>
      </div>
    </div>
  );
}
