"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Check, Loader2, Mail, MessageCircle, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatearFechaHora } from "@/lib/format";
import { enlaceWhatsApp, telefonoLegible } from "@/lib/landing";
import type { LeadFila } from "@/lib/datos/leads";
import { cambiarEstadoLead, convertirLeadEnEmpresa, eliminarLead } from "./acciones";

const ESTADO = {
  nuevo: { texto: "Nuevo", variant: "ok" as const },
  contactado: { texto: "Contactado", variant: "warn" as const },
  convertido: { texto: "Convertido", variant: "outline" as const },
};

/** Un mensaje de la landing: contactar por WhatsApp o correo, marcar contactado, convertir en empresa. */
export function TarjetaLead({ l, responsable }: { l: LeadFila; responsable: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const e = ESTADO[l.estado];
  const saludo = `Hola ${l.nombre.split(" ")[0]}, soy ${responsable.split(" ")[0]} de agueMar. Recibí tu mensaje desde la web`;
  const wa = enlaceWhatsApp(l.telefono, `${saludo}${l.servicio ? ` sobre ${l.servicio.toLowerCase()}` : ""}.`);

  const estado = (nuevo: "nuevo" | "contactado") =>
    iniciar(async () => {
      const r = await cambiarEstadoLead(l.id, nuevo);
      if (!r.ok) toast.error(r.error);
    });
  const convertir = () =>
    iniciar(async () => {
      const r = await convertirLeadEnEmpresa(l.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Empresa creada. Completa su RUC y datos.");
      router.push(`/panel/clientes/${r.data.clienteId}/editar`);
    });
  const eliminar = () =>
    iniciar(async () => {
      if (!window.confirm(`¿Eliminar el mensaje de ${l.nombre}?`)) return;
      const r = await eliminarLead(l.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Mensaje eliminado.");
    });

  return (
    <li className={`rounded-lg border p-4 ${l.estado === "nuevo" ? "border-mint-ink/40 bg-mint-soft/40 dark:bg-success-bg/30" : "border-border"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={e.variant} dot>
          {e.texto}
        </Badge>
        <span className="font-medium text-foreground">{l.nombre}</span>
        <span>·</span>
        <span className="font-mono">{formatearFechaHora(l.created_at)}</span>
        {l.servicio ? <span className="rounded-full border border-border px-2 py-0.5">{l.servicio}</span> : null}
      </div>
      {l.mensaje ? <p className="mt-2 whitespace-pre-line text-sm">{l.mensaje}</p> : null}
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {l.telefono ? <span className="font-mono">{telefonoLegible(l.telefono)}</span> : null}
        {l.correo ? <span className="break-all font-mono">{l.correo}</span> : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {wa ? (
          <Button asChild size="sm" variant="mint">
            <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => (l.estado === "nuevo" ? estado("contactado") : undefined)}>
              <MessageCircle /> WhatsApp
            </a>
          </Button>
        ) : null}
        {l.correo ? (
          <Button asChild size="sm" variant="outline">
            <a href={`mailto:${l.correo}?subject=${encodeURIComponent("Tu mensaje a agueMar")}`} onClick={() => (l.estado === "nuevo" ? estado("contactado") : undefined)}>
              <Mail /> Correo
            </a>
          </Button>
        ) : null}
        {l.clientes ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/panel/clientes/${l.clientes.id}`}>
              <Building2 /> {l.clientes.nombre}
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={convertir} disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Building2 />} Crear empresa
          </Button>
        )}
        {l.estado === "nuevo" ? (
          <Button size="sm" variant="ghost" onClick={() => estado("contactado")} disabled={pendiente}>
            <Check /> Marcar contactado
          </Button>
        ) : l.estado === "contactado" ? (
          <Button size="sm" variant="ghost" onClick={() => estado("nuevo")} disabled={pendiente}>
            <Undo2 /> Volver a nuevo
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={eliminar} disabled={pendiente} aria-label={`Eliminar el mensaje de ${l.nombre}`}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
