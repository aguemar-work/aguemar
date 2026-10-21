"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { FileText, KanbanSquare, Loader2, MessageSquareReply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Campo } from "@/components/formulario/campo";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { formatearFecha, formatearFechaHora } from "@/lib/format";
import type { SolicitudFila } from "@/lib/datos/calendario";
import { convertirEnCotizacion, convertirEnTrabajo, eliminarSolicitud, responderSolicitud } from "@/app/panel/calendario/acciones";

const ESTADO: Record<SolicitudFila["estado"], { texto: string; variant: "ok" | "warn" | "danger" | "outline" }> = {
  nueva: { texto: "Nueva", variant: "ok" },
  en_revision: { texto: "En revisión", variant: "warn" },
  aceptada: { texto: "Aceptada", variant: "outline" },
  rechazada: { texto: "Rechazada", variant: "danger" },
};

/** Una solicitud de empresa con sus acciones: responder, convertir en trabajo o en cotización. */
export function TarjetaSolicitud({ s }: { s: SolicitudFila }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const e = ESTADO[s.estado];

  const aTrabajo = () =>
    iniciar(async () => {
      const r = await convertirEnTrabajo(s.id);
      if (!r.ok) return void avisoError(r.error);
      toast.success("Trabajo creado en propuesta; la empresa ya lo ve en sus proyectos.");
      router.push(`/panel/trabajos/${r.data.trabajoId}`);
    });
  const aCotizacion = () =>
    iniciar(async () => {
      const r = await convertirEnCotizacion(s.id);
      if (!r.ok) return void avisoError(r.error);
      toast.success("Cotización en borrador creada: agrégale líneas y envíala.");
      router.push(`/panel/cotizaciones/${r.data.cotizacionId}/editar`);
    });

  return (
    <li className={`rounded-lg border p-4 ${s.estado === "nueva" ? "border-mint-ink/40 bg-mint-soft/40 dark:bg-success-bg/30" : "border-border"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={e.variant} dot>
          {e.texto}
        </Badge>
        <span className="font-medium text-foreground">{s.clientes?.nombre ?? "Empresa"}</span>
        <span>·</span>
        <span className="font-mono">{formatearFechaHora(s.created_at)}</span>
        {s.area ? <EtiquetaArea area={s.area} /> : null}
        {s.prioridad === "alta" ? <Badge variant="danger">Prioridad alta</Badge> : null}
        {s.fecha_deseada ? <span>para el {formatearFecha(s.fecha_deseada)}</span> : null}
      </div>
      <p className="mt-2 font-medium">{s.titulo}</p>
      {s.descripcion ? <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{s.descripcion}</p> : null}
      {s.respuesta ? (
        <p className="mt-2 rounded-md bg-soft p-2 text-sm dark:bg-secondary/50">
          <span className="text-xs text-muted-foreground">Tu respuesta: </span>
          {s.respuesta}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {s.trabajo_id ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/panel/trabajos/${s.trabajo_id}`}>
              <KanbanSquare /> Ver trabajo
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="mint" onClick={aTrabajo} disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : <KanbanSquare />} Convertir en trabajo
          </Button>
        )}
        {s.cotizacion_id ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/panel/cotizaciones/${s.cotizacion_id}`}>
              <FileText /> Ver cotización
            </Link>
          </Button>
        ) : !s.trabajo_id ? (
          <Button size="sm" variant="outline" onClick={aCotizacion} disabled={pendiente}>
            <FileText /> Cotizar
          </Button>
        ) : null}
        <Responder s={s} />
        <Button
          size="sm"
          variant="ghost"
          aria-label="Eliminar solicitud"
          disabled={pendiente}
          onClick={() => {
            if (!window.confirm("¿Eliminar esta solicitud? La empresa dejará de verla.")) return;
            iniciar(async () => {
              const r = await eliminarSolicitud(s.id);
              if (!r.ok) avisoError(r.error);
            });
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function Responder({ s }: { s: SolicitudFila }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"en_revision" | "aceptada" | "rechazada">(s.estado === "nueva" ? "en_revision" : (s.estado as "en_revision" | "aceptada" | "rechazada"));
  const [respuesta, setRespuesta] = useState(s.respuesta ?? "");
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquareReply /> Responder
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Responder a {s.clientes?.nombre ?? "la empresa"}</DialogTitle>
          <DialogDescription>La empresa ve el estado y tu mensaje en Solicitudes.</DialogDescription>
        </DialogHeader>
        <Campo id={`estado-${s.id}`} etiqueta="Estado">
          <Select id={`estado-${s.id}`} value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)}>
            <option value="en_revision">En revisión</option>
            <option value="aceptada">Aceptada</option>
            <option value="rechazada">Rechazada</option>
          </Select>
        </Campo>
        <Campo id={`resp-${s.id}`} etiqueta="Mensaje">
          <Textarea id={`resp-${s.id}`} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} rows={4} placeholder="Lo reviso esta semana y te paso la cotización." />
        </Campo>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button
            variant="mint"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await responderSolicitud(s.id, { estado, respuesta });
                if (!r.ok) return void avisoError(r.error);
                toast.success("Respuesta enviada.");
                setAbierto(false);
              })
            }
          >
            {pendiente ? <Loader2 className="animate-spin" /> : null} Enviar respuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
