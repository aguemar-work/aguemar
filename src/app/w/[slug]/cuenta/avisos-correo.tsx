"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { avisoError } from "@/lib/avisos";
import { guardarAvisosCuenta } from "../acciones";

/** Interruptor de los avisos por correo: cambia al instante y vuelve atrás si la base no lo guarda. */
export function AvisosCorreo({ slug, activos }: { slug: string; activos: boolean }) {
  const [valor, setValor] = useState(activos);
  const [pendiente, iniciar] = useTransition();

  const cambiar = (nuevo: boolean) => {
    setValor(nuevo);
    iniciar(async () => {
      const r = await guardarAvisosCuenta(slug, nuevo);
      if (!r.ok) {
        setValor(!nuevo);
        return void avisoError(r.error);
      }
      toast.success(nuevo ? "Te avisaremos por correo." : "Apagamos los avisos por correo.");
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Switch checked={valor} onCheckedChange={cambiar} disabled={pendiente} aria-labelledby="etiqueta-avisos" />
      <span id="etiqueta-avisos" className="text-sm font-medium">
        {valor ? "Recibir avisos por correo" : "Sin avisos por correo"}
      </span>
    </div>
  );
}
