"use client";

import { useOptimistic, useTransition } from "react";
import { avisoError } from "@/lib/avisos";
import { cambiarEstadoActividad } from "./acciones";

/** Check para marcar una actividad como hecha desde la lista, al instante. */
export function MarcarHecha({ id, hecha, titulo }: { id: string; hecha: boolean; titulo: string }) {
  const [, iniciar] = useTransition();
  const [valor, setValor] = useOptimistic(hecha);
  return (
    <input
      type="checkbox"
      className="size-4 shrink-0 accent-mint-ink dark:accent-mint"
      checked={valor}
      aria-label={`Marcar "${titulo}" como hecha`}
      onChange={(e) => {
        const v = e.target.checked;
        iniciar(async () => {
          setValor(v);
          const r = await cambiarEstadoActividad(id, v ? "hecha" : "planificada");
          if (!r.ok) avisoError(r.error);
        });
      }}
    />
  );
}
