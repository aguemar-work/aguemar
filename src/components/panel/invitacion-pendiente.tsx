"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { Ban, Check, Copy, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { enlaceInvitacion, whatsappInvitacion } from "@/lib/invitaciones";
import { formatearFecha } from "@/lib/format";
import { renovarInvitacion, revocarInvitacion } from "@/app/panel/clientes/acciones";

interface Props {
  id: string;
  token: string;
  correo: string;
  expiraEn: string;
  tipo: "empresa" | "colaborador";
  /** Ruta que se revalida al renovar o revocar. */
  ruta: string;
}

/** Invitación pendiente: copiar el enlace, mandarlo por WhatsApp, renovarlo o anularlo. */
export function InvitacionPendiente({ id, token, correo, expiraEn, tipo, ruta }: Props) {
  const [enlace, setEnlace] = useState(() => enlaceInvitacion(token));
  const [copiado, setCopiado] = useState(false);
  const [pendiente, iniciar] = useTransition();
  // La hora se fija al montar: leerla en cada render no es puro (y el estado de "vencida" no necesita más).
  const [ahora] = useState(() => Date.now());
  const vencida = new Date(expiraEn).getTime() < ahora;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      toast.success("Enlace copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      avisoError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  };

  const renovar = () =>
    iniciar(async () => {
      const r = await renovarInvitacion(id, ruta);
      if (!r.ok) return void avisoError(r.error);
      setEnlace(r.data.enlace);
      toast.success("Enlace nuevo listo. El anterior ya no sirve.");
    });

  const revocar = () =>
    iniciar(async () => {
      const r = await revocarInvitacion(id, ruta);
      if (!r.ok) return void avisoError(r.error);
      toast.success("Invitación anulada.");
    });

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={vencida ? "danger" : "warn"} dot>
          {vencida ? "Invitación vencida" : "Invitación pendiente"}
        </Badge>
        <span className="font-mono">{correo}</span>
        <span className="text-xs text-muted-foreground">{vencida ? "venció" : "vence"} el {formatearFecha(expiraEn)}</span>
      </div>
      {!vencida ? (
        <p className="break-all rounded bg-soft px-3 py-2 font-mono text-xs dark:bg-secondary" aria-label="Enlace de invitación">
          {enlace}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!vencida ? (
          <>
            <Button type="button" variant="mint" size="sm" onClick={copiar}>
              {copiado ? <Check aria-hidden /> : <Copy aria-hidden />} Copiar enlace
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={whatsappInvitacion(enlace, tipo)} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden /> Enviar por WhatsApp
              </a>
            </Button>
          </>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={renovar} disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />} {vencida ? "Generar enlace nuevo" : "Renovar enlace"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={revocar} disabled={pendiente}>
          <Ban aria-hidden /> Anular
        </Button>
      </div>
    </div>
  );
}
