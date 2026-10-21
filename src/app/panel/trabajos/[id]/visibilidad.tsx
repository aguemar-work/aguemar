"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cambiarVisibilidadTrabajo } from "../acciones";

export function VisibilidadTrabajo({ id, visible, tieneEmpresa }: { id: string; visible: boolean; tieneEmpresa: boolean }) {
  const [pendiente, iniciar] = useTransition();
  if (!tieneEmpresa) return null;
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      {visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
      Visible en el workspace
      <Switch
        checked={visible}
        disabled={pendiente}
        aria-label="Visible para la empresa"
        onCheckedChange={(v) =>
          iniciar(async () => {
            const r = await cambiarVisibilidadTrabajo(id, v);
            if (!r.ok) avisoError(r.error);
            else toast.success(v ? "La empresa ya puede ver este trabajo." : "Oculto para la empresa.");
          })
        }
      />
    </label>
  );
}
