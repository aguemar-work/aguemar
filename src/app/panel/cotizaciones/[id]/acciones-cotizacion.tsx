"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { Check, Copy, FileDown, Loader2, MessageCircle, MoreHorizontal, Pencil, Send, X, CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Campo } from "@/components/formulario/campo";
import { formatearMonto, type Moneda } from "@/lib/format";
import type { EstadoCotizacion } from "@/types/database";
import { aceptarCotizacion, duplicarCotizacion, enviarCotizacion, rechazarCotizacion } from "../acciones";

interface Props {
  id: string;
  numero: string | null;
  estado: EstadoCotizacion;
  total: number;
  moneda: Moneda;
  asunto: string;
  vence: string;
  empresa: { nombre: string; contacto: string | null; telefono: string | null; slug: string | null; conWorkspace: boolean };
  /** Token del portal (/d/…) si la cotización ya tiene enlace. */
  token: string | null;
}

/** Acciones de una cotización según su estado: editar, enviar, aceptar, rechazar, duplicar, PDF y WhatsApp. */
export function AccionesCotizacion({ id, numero, estado, total, moneda, asunto, vence, empresa, token: tokenInicial }: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [token, setToken] = useState(tokenInicial);
  const [dialogo, setDialogo] = useState<"aceptar" | "rechazar" | "mensaje" | null>(null);

  const enviar = () =>
    iniciar(async () => {
      const r = await enviarCotizacion(id);
      if (!r.ok) return void avisoError(r.error);
      if (r.data.token) setToken(r.data.token);
      toast.success(empresa.conWorkspace ? "Enviada: ya aparece en el workspace de la empresa." : "Marcada como enviada.");
      setDialogo("mensaje");
    });

  const duplicar = () =>
    iniciar(async () => {
      const r = await duplicarCotizacion(id);
      if (!r.ok) return void avisoError(r.error);
      toast.success("Copia creada como borrador.");
      router.push(`/panel/cotizaciones/${r.data.id}`);
    });

  const editable = estado !== "aceptada";
  const enviable = estado === "borrador" || estado === "vencida" || estado === "rechazada";
  const aceptable = estado !== "aceptada" && total > 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {enviable ? (
          <Button variant="mint" onClick={enviar} disabled={pendiente || total <= 0}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Send />} {estado === "borrador" ? "Enviar" : "Reenviar"}
          </Button>
        ) : null}
        {aceptable ? (
          <Button variant={enviable ? "outline" : "mint"} onClick={() => setDialogo("aceptar")}>
            <Check /> Marcar aceptada
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <a href={`/panel/cotizaciones/${id}/pdf`} target="_blank" rel="noopener">
            <FileDown /> PDF
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Más acciones">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {editable ? (
              <DropdownMenuItem asChild>
                <Link href={`/panel/cotizaciones/${id}/editar`}>
                  <Pencil /> Editar
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => setDialogo("mensaje")}>
              <MessageCircle /> Mensaje para WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/panel/cotizaciones/${id}/pdf?descargar=1`}>
                <FileDown /> Descargar PDF
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={duplicar}>
              <CopyPlus /> Duplicar
            </DropdownMenuItem>
            {estado === "enviada" ? (
              <DropdownMenuItem onSelect={() => setDialogo("rechazar")}>
                <X /> Marcar rechazada
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DialogoAceptar abierto={dialogo === "aceptar"} onCerrar={() => setDialogo(null)} id={id} contacto={empresa.contacto} total={formatearMonto(total, moneda)} />
      <DialogoRechazar abierto={dialogo === "rechazar"} onCerrar={() => setDialogo(null)} id={id} />
      <DialogoMensaje
        abierto={dialogo === "mensaje"}
        onCerrar={() => setDialogo(null)}
        id={id}
        numero={numero}
        asunto={asunto}
        total={formatearMonto(total, moneda)}
        vence={vence}
        empresa={empresa}
        token={token}
      />
    </>
  );
}

function DialogoAceptar({ abierto, onCerrar, id, contacto, total }: { abierto: boolean; onCerrar: () => void; id: string; contacto: string | null; total: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(contacto ?? "");
  const [dni, setDni] = useState("");
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  const aceptar = () =>
    iniciar(async () => {
      setError(undefined);
      const r = await aceptarCotizacion(id, { nombre, dni });
      if (!r.ok) return setError(r.error);
      onCerrar();
      toast.success("Aceptada. El trabajo ya está creado y en curso.", {
        action: r.data.trabajoId ? { label: "Ver trabajo", onClick: () => router.push(`/panel/trabajos/${r.data.trabajoId}`) } : undefined,
      });
    });

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como aceptada</DialogTitle>
          <DialogDescription>
            Por {total}. Se crea el trabajo en curso con una tarea por cada línea. Si la empresa tiene workspace, también puede aceptarla ella misma.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Campo id="acepta-nombre" etiqueta="Quién acepta" requerido>
            <Input id="acepta-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </Campo>
          <Campo id="acepta-dni" etiqueta="DNI" ayuda="Opcional">
            <Input id="acepta-dni" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" className="font-mono" />
          </Campo>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="mint" onClick={aceptar} disabled={pendiente || nombre.trim().length < 2}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Check />} Aceptar y crear trabajo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoRechazar({ abierto, onCerrar, id }: { abierto: boolean; onCerrar: () => void; id: string }) {
  const [motivo, setMotivo] = useState("");
  const [pendiente, iniciar] = useTransition();
  const rechazar = () =>
    iniciar(async () => {
      const r = await rechazarCotizacion(id, motivo);
      if (!r.ok) return void avisoError(r.error);
      toast.success("Marcada como rechazada.");
      onCerrar();
    });
  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como rechazada</DialogTitle>
          <DialogDescription>Anota el motivo para la próxima propuesta. Podrás reenviarla o duplicarla.</DialogDescription>
        </DialogHeader>
        <Campo id="motivo" etiqueta="Motivo" ayuda="Opcional: precio, plazo, eligieron a otro…">
          <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
        </Campo>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={rechazar} disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : <X />} Marcar rechazada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoMensaje({
  abierto,
  onCerrar,
  id,
  numero,
  asunto,
  total,
  vence,
  empresa,
  token,
}: {
  token: string | null;
  abierto: boolean;
  onCerrar: () => void;
  id: string;
  numero: string | null;
  asunto: string;
  total: string;
  vence: string;
  empresa: Props["empresa"];
}) {
  const origen = typeof window === "undefined" ? "" : window.location.origin;
  const saludo = empresa.contacto ? `Hola ${empresa.contacto.split(" ")[0]}` : "Hola";
  const texto = empresa.conWorkspace
    ? `${saludo}, te envío la cotización ${numero} (${asunto}) por ${total}, válida hasta el ${vence}. Puedes revisarla, descargar el PDF y aceptarla en tu espacio: ${origen}/w/${empresa.slug}/cotizaciones/${id}`
    : token
      ? `${saludo}, te envío la cotización ${numero} (${asunto}) por ${total}, válida hasta el ${vence}. Aquí puedes verla, descargar el PDF y aceptarla: ${origen}/d/${token}`
      : `${saludo}, te envío la cotización ${numero} (${asunto}) por ${total}, válida hasta el ${vence}. Te adjunto el PDF; cualquier duda me escribes.`;
  const telefono = (empresa.telefono ?? "").replace(/\D/g, "");
  const wa = telefono ? `https://wa.me/${telefono.length === 9 ? `51${telefono}` : telefono}?text=${encodeURIComponent(texto)}` : null;

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensaje para {empresa.nombre}</DialogTitle>
          <DialogDescription>
            {empresa.conWorkspace
              ? "La empresa tiene el módulo Cotizaciones: el enlace la lleva a su espacio."
              : token
                ? "El enlace abre la cotización sin iniciar sesión; desde ahí la pueden aceptar con nombre y DNI."
                : "Envíala primero para generar el enlace, o adjunta el PDF."}
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-line rounded-md bg-soft p-3 text-sm dark:bg-secondary/50">{texto}</p>
        <DialogFooter>
          {!empresa.conWorkspace ? (
            <Button asChild variant="outline">
              <a href={`/panel/cotizaciones/${id}/pdf?descargar=1`}>
                <FileDown /> Descargar PDF
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(texto);
                toast.success("Mensaje copiado.");
              } catch {
                avisoError("No se pudo copiar; selecciónalo a mano.");
              }
            }}
          >
            <Copy /> Copiar
          </Button>
          {wa ? (
            <Button asChild variant="mint">
              <a href={wa} target="_blank" rel="noopener">
                <MessageCircle /> Abrir WhatsApp
              </a>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
