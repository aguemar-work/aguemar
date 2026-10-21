"use client";

import { useTransition } from "react";
import { avisoError } from "@/lib/avisos";
import { Check, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marcarComentarioLeido } from "./acciones";

export function BotonLeido({ id, leido }: { id: string; leido: boolean }) {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await marcarComentarioLeido(id, !leido);
          if (!r.ok) avisoError(r.error);
        })
      }
    >
      {pendiente ? <Loader2 className="animate-spin" /> : leido ? <Undo2 /> : <Check />}
      {leido ? "Marcar no leído" : "Marcar leído"}
    </Button>
  );
}
