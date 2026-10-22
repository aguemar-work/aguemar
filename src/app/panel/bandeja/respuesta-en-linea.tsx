"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, MessageSquareReply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { avisoError } from "@/lib/avisos";
import type { EntidadComentario } from "@/types/database";
import { comentarPropietario } from "./acciones";

/** Responde a la empresa desde la tarjeta, con la misma acción que el hilo del detalle (y la empresa recibe el aviso). */
export function RespuestaEnLinea({ entidad, entidadId, clienteId, etiqueta }: { entidad: EntidadComentario; entidadId: string; clienteId: string; etiqueta: string }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();

  if (!abierto) {
    return (
      <Button type="button" size="sm" variant="mint" onClick={() => setAbierto(true)}>
        <MessageSquareReply aria-hidden /> Responder
      </Button>
    );
  }

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    iniciar(async () => {
      const r = await comentarPropietario(entidad, entidadId, clienteId, t);
      if (!r.ok) return void avisoError(r.error);
      toast.success("Respuesta enviada.");
      setTexto("");
      setAbierto(false);
    });
  };

  return (
    <form onSubmit={enviar} className="w-full space-y-2">
      <label htmlFor={`resp-${entidadId}`} className="sr-only">
        Tu respuesta sobre {etiqueta}
      </label>
      <Textarea id={`resp-${entidadId}`} value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={4000} autoFocus placeholder="Escribe tu respuesta; la empresa la ve en su espacio…" />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setAbierto(false)} disabled={pendiente}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" variant="mint" disabled={pendiente || !texto.trim()}>
          {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />} Enviar
        </Button>
      </div>
    </form>
  );
}
