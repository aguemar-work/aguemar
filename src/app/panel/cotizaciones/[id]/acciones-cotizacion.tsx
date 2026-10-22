"use client";

import { useState, useTransition } from "react";
import Link from "@/components/panel/enlace";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { Ban, Check, Copy, FileDown, Link2, Loader2, Mail, MessageCircle, MoreHorizontal, Pencil, Send, UserPlus, X, CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Campo } from "@/components/formulario/campo";
import { formatearFecha, formatearMonto, hoyLima, type Moneda } from "@/lib/format";
import { mensajeWhatsAppCotizacion } from "@/lib/cotizacion";
import { abrirCreado } from "@/lib/navegacion";
import type { EstadoCotizacion } from "@/types/database";
import { aceptarCotizacion, anularCotizacion, duplicarCotizacion, enviarCotizacion, invitarEmpresaDesdeCotizacion, rechazarCotizacion } from "../acciones";

interface Props {
  id: string;
  numero: string | null;
  estado: EstadoCotizacion;
  total: number;
  moneda: Moneda;
  asunto: string;
  vence: string;
  empresa: { nombre: string; contacto: string | null; telefono: string | null; correo: string | null; slug: string | null; conWorkspace: boolean; invitable: boolean };
  /** Token del portal (/d/…) si la cotización ya tiene enlace. */
  token: string | null;
  /** Fecha de aceptación (ISO) si está aceptada. */
  aceptadaEn: string | null;
  /** Lo cobrado y vigente (céntimos), para avisar al anular. */
  cobrado: number;
}

/** Acciones de una cotización según su estado: editar, enviar, aceptar, rechazar, duplicar, PDF y WhatsApp. */
export function AccionesCotizacion({ id, numero, estado, total, moneda, asunto, vence, empresa, token: tokenInicial, aceptadaEn, cobrado }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [token, setToken] = useState(tokenInicial);
  const [dialogo, setDialogo] = useState<"aceptar" | "rechazar" | "anular" | "mensaje" | null>(null);
  /** A qué correo salió el aviso al enviar (null: no salió); se muestra en el diálogo. */
  const [correoAviso, setCorreoAviso] = useState<string | null | undefined>(undefined);

  const enviar = () =>
    iniciar(async () => {
      const r = await enviarCotizacion(id);
      if (!r.ok) return void avisoError(r.error);
      if (r.data.token) setToken(r.data.token);
      setCorreoAviso(r.data.correoAviso);
      toast.success(empresa.conWorkspace ? "Enviada: ya aparece en el espacio de la empresa." : r.data.correoAviso ? `Enviada por correo a ${r.data.correoAviso}.` : "Marcada como enviada.");
      setDialogo("mensaje");
    });

  const duplicar = () =>
    iniciar(async () => {
      const r = await duplicarCotizacion(id);
      if (!r.ok) return void avisoError(r.error);
      toast.success("Copia creada como borrador.");
      abrirCreado(`/panel/cotizaciones/${r.data.id}`);
    });

  const editable = estado !== "aceptada" && estado !== "anulada";
  const enviable = estado === "borrador" || estado === "vencida" || estado === "rechazada";
  const aceptable = estado !== "aceptada" && estado !== "anulada" && total > 0;

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
              <MessageCircle /> {estado === "aceptada" ? "Confirmar por WhatsApp" : "Mensaje para WhatsApp"}
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
            {estado === "aceptada" ? (
              <DropdownMenuItem onSelect={() => setDialogo("anular")}>
                <Ban /> Anular cotización
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DialogoAceptar
        abierto={dialogo === "aceptar"}
        onCerrar={() => setDialogo(null)}
        onAceptada={() => setDialogo("mensaje")}
        id={id}
        contacto={empresa.contacto}
        total={formatearMonto(total, moneda)}
      />
      <DialogoRechazar abierto={dialogo === "rechazar"} onCerrar={() => setDialogo(null)} id={id} />
      <DialogoAnular abierto={dialogo === "anular"} onCerrar={() => setDialogo(null)} id={id} numero={numero} cobrado={cobrado > 0 ? formatearMonto(cobrado, moneda) : null} />
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
        correoAviso={correoAviso}
        // Recién aceptada, la fecha del servidor puede no haber llegado aún: es hoy.
        aceptadaEl={estado === "aceptada" || aceptadaEn ? formatearFecha(aceptadaEn ? aceptadaEn.slice(0, 10) : hoyLima()) : null}
      />
    </>
  );
}

function DialogoAceptar({
  abierto,
  onCerrar,
  onAceptada,
  id,
  contacto,
  total,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onAceptada: () => void;
  id: string;
  contacto: string | null;
  total: string;
}) {
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
      // Último paso del flujo: mandar al contacto la cotización aceptada por WhatsApp.
      onAceptada();
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

function DialogoAnular({ abierto, onCerrar, id, numero, cobrado }: { abierto: boolean; onCerrar: () => void; id: string; numero: string | null; cobrado: string | null }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const anular = () =>
    iniciar(async () => {
      setError(undefined);
      const r = await anularCotizacion(id, motivo);
      if (!r.ok) return setError(r.error);
      toast.success("Cotización anulada.");
      onCerrar();
    });
  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular {numero ?? "la cotización"}</DialogTitle>
          <DialogDescription>
            Deja de contar como deuda y de generar recordatorios. La aceptación queda guardada tal como fue. Esto no se deshace: si el trabajo sigue, haz otra cotización.
          </DialogDescription>
        </DialogHeader>
        {cobrado ? (
          <p className="rounded-md bg-warning-bg p-3 text-sm text-warning-foreground">
            Tiene {cobrado} cobrados. Seguirán a favor de la empresa y pagarán sus otras deudas; si los devolviste, anula cada cobro desde su lista.
          </p>
        ) : null}
        <Campo id="anular-motivo" etiqueta="Motivo" requerido error={error}>
          <Textarea id="anular-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} autoFocus aria-invalid={error ? true : undefined} />
        </Campo>
        <DialogFooter>
          <Button variant="outline" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={anular} disabled={pendiente || motivo.trim().length < 3}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Ban />} Anular cotización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(aviso);
  } catch {
    avisoError("No se pudo copiar; selecciónalo a mano.");
  }
}

/**
 * Tras enviar o aceptar: las tres vías en un sitio (enlace, correo, PDF), el mensaje para WhatsApp
 * y, si la empresa tiene correo y aún no tiene usuario, invitarla a su espacio desde aquí mismo.
 */
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
  correoAviso,
  aceptadaEl,
}: {
  token: string | null;
  /** undefined: no se acaba de enviar (no se sabe); null: no salió correo. */
  correoAviso: string | null | undefined;
  aceptadaEl: string | null;
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
  const enlace = empresa.conWorkspace
    ? { url: `${origen}/w/${empresa.slug}/cotizaciones/${id}`, via: "workspace" as const }
    : token
      ? { url: `${origen}/d/${token}`, via: "portal" as const }
      : null;
  const texto = mensajeWhatsAppCotizacion({ numero, asunto, total, vence, contacto: empresa.contacto, enlace, aceptadaEl });
  const telefono = (empresa.telefono ?? "").replace(/\D/g, "");
  const wa = telefono ? `https://wa.me/${telefono.length === 9 ? `51${telefono}` : telefono}?text=${encodeURIComponent(texto)}` : null;

  const [invitando, iniciarInvitacion] = useTransition();
  const [invitacion, setInvitacion] = useState<{ enlace: string; correo: string } | null>(null);
  const invitar = () =>
    iniciarInvitacion(async () => {
      const r = await invitarEmpresaDesdeCotizacion(id);
      if (!r.ok) return void avisoError(r.error);
      setInvitacion(r.data);
      toast.success(`Invitación enviada a ${r.data.correo}.`);
    });

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{aceptadaEl ? `Confirmar a ${empresa.nombre}` : `Mensaje para ${empresa.nombre}`}</DialogTitle>
          <DialogDescription>
            {aceptadaEl
              ? "Envía al contacto la cotización aceptada con su PDF: es la confirmación final por WhatsApp."
              : empresa.conWorkspace
              ? "La empresa tiene el módulo Cotizaciones: el enlace la lleva a su espacio."
              : token
                ? "El enlace abre la cotización sin iniciar sesión; desde ahí la pueden aceptar con nombre y DNI."
                : "Envíala primero para generar el enlace, o adjunta el PDF."}
          </DialogDescription>
        </DialogHeader>
        {correoAviso !== undefined ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4 shrink-0" aria-hidden />
            {correoAviso ? (
              <span>
                Correo enviado a <span className="font-mono text-foreground">{correoAviso}</span>.
              </span>
            ) : (
              "No salió correo: la empresa no tiene correo, tiene los avisos apagados o Resend no está activo."
            )}
          </p>
        ) : null}
        <p className="whitespace-pre-line rounded-md bg-soft p-3 text-sm dark:bg-secondary/50">{texto}</p>
        {empresa.invitable ? (
          <div className="rounded-md border border-dashed border-border p-3 text-sm">
            {invitacion ? (
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  Invitación enviada a <span className="font-mono">{invitacion.correo}</span>; vence en 7 días.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => copiar(invitacion.enlace, "Enlace de invitación copiado.")}>
                  <Copy aria-hidden /> Copiar enlace de invitación
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {aceptadaEl ? "Para que siga el trabajo y sus cobros desde su espacio." : "Para que la vea y la acepte desde su espacio."}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={invitar} disabled={invitando}>
                  {invitando ? <Loader2 className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />} Invitar a su espacio
                </Button>
              </div>
            )}
          </div>
        ) : null}
        <DialogFooter>
          {/* Siempre: la cotización se manda en PDF por WhatsApp, tenga o no la empresa su espacio. */}
          <Button asChild variant="outline">
            <a href={`/panel/cotizaciones/${id}/pdf?descargar=1`}>
              <FileDown /> {aceptadaEl ? "Descargar PDF aceptado" : "Descargar PDF"}
            </a>
          </Button>
          {enlace ? (
            <Button variant="outline" onClick={() => copiar(enlace.url, "Enlace copiado.")}>
              <Link2 /> Copiar enlace
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => copiar(texto, "Mensaje copiado.")}>
            <Copy /> Copiar mensaje
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
