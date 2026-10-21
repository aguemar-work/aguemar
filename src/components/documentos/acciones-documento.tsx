"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import QRCode from "qrcode";
import { Copy, ExternalLink, FileDown, Link2, Loader2, MessageCircle, MoreHorizontal, Pencil, RefreshCw, Send, ShieldOff, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NOMBRE_DOCUMENTO, urlPortal } from "@/lib/documentos";
import type { Resultado } from "@/lib/datos/resultado";
import { enlaceDocumento, revocarEnlace } from "@/app/panel/fichas/acciones";

type Tipo = "ficha" | "brief" | "acta" | "informe";

interface Props {
  tipo: Tipo;
  id: string;
  numero: string | null;
  titular: string;
  publicada: boolean;
  token: string | null;
  vistas: number;
  empresa: { nombre: string; contacto: string | null; telefono: string | null; slug: string | null; conWorkspace: boolean };
  /** Server Action atada al documento: publica o despublica y devuelve el token. */
  publicar: (publicar: boolean) => Promise<Resultado<{ token: string | null }>>;
  /** Ruta del documento en el panel, p. ej. /panel/fichas/<id>. */
  ruta: string;
  /** Ruta del documento dentro del workspace, p. ej. documentos/<id>. */
  rutaWorkspace: string;
  /** Sin edición (acta ya aceptada). */
  bloqueado?: boolean;
  /** Botones extra, p. ej. registrar la conformidad del acta. */
  extra?: React.ReactNode;
}

/** Publicar, PDF, enlace público con QR, mensaje para WhatsApp y edición (fichas, briefs, actas e informes). */
export function AccionesDocumento({ tipo, id, numero, titular, publicada, token: tokenInicial, vistas, empresa, publicar: accionPublicar, ruta, rutaWorkspace, bloqueado, extra }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [token, setToken] = useState(tokenInicial);
  const [dialogo, setDialogo] = useState<"enlace" | "mensaje" | null>(null);

  const publicar = (valor: boolean) =>
    iniciar(async () => {
      const r = await accionPublicar(valor);
      if (!r.ok) return void avisoError(r.error);
      if (r.data.token) setToken(r.data.token);
      toast.success(valor ? "Publicado: la empresa lo ve y el enlace está activo." : "Volvió a borrador: el enlace deja de mostrarlo.");
      if (valor) setDialogo("mensaje");
    });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {publicada ? (
          <Button variant="outline" onClick={() => publicar(false)} disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Undo2 />} Despublicar
          </Button>
        ) : (
          <Button variant="mint" onClick={() => publicar(true)} disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Send />} Publicar
          </Button>
        )}
        {extra}
        <Button asChild variant="outline">
          <a href={`${ruta}/pdf`} target="_blank" rel="noopener">
            <FileDown /> PDF
          </a>
        </Button>
        {bloqueado ? null : (
          <Button asChild variant="outline">
            <Link href={`${ruta}/editar`}>
              <Pencil /> Editar
            </Link>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Más acciones">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDialogo("enlace")} disabled={!publicada}>
              <Link2 /> Enlace público y QR
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialogo("mensaje")} disabled={!publicada}>
              <MessageCircle /> Mensaje para WhatsApp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`${ruta}/pdf?descargar=1`}>
                <FileDown /> Descargar PDF
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DialogoEnlace abierto={dialogo === "enlace"} onCerrar={() => setDialogo(null)} tipo={tipo} id={id} token={token} vistas={vistas} onToken={setToken} />
      <DialogoMensaje
        abierto={dialogo === "mensaje"}
        onCerrar={() => setDialogo(null)}
        tipo={tipo}
        rutaWorkspace={rutaWorkspace}
        numero={numero}
        titular={titular}
        token={token}
        empresa={empresa}
      />
    </>
  );
}

function useOrigen() {
  const [origen, setOrigen] = useState("");
  useEffect(() => setOrigen(window.location.origin), []);
  return origen;
}

function DialogoEnlace({
  abierto,
  onCerrar,
  tipo,
  id,
  token,
  vistas,
  onToken,
}: {
  abierto: boolean;
  onCerrar: () => void;
  tipo: Tipo;
  id: string;
  token: string | null;
  vistas: number;
  onToken: (t: string | null) => void;
}) {
  const origen = useOrigen();
  const [qr, setQr] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const url = token && origen ? urlPortal(origen, token) : "";

  useEffect(() => {
    if (!url) return setQr(undefined);
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#0A0F1A", light: "#FFFFFF" } }).then(setQr, () => setQr(undefined));
  }, [url]);

  const renovar = () =>
    iniciar(async () => {
      if (!window.confirm("El enlace actual y el QR de los PDF ya descargados dejarán de funcionar. ¿Generar uno nuevo?")) return;
      const r = await enlaceDocumento(tipo, id, true);
      if (!r.ok) return void avisoError(r.error);
      onToken(r.data.token);
      toast.success("Enlace nuevo generado. Descarga el PDF otra vez para que lleve el QR nuevo.");
    });
  const revocar = () =>
    iniciar(async () => {
      if (!window.confirm("Nadie podrá abrir el documento con este enlace. ¿Revocar?")) return;
      const r = await revocarEnlace(tipo, id);
      if (!r.ok) return void avisoError(r.error);
      onToken(null);
      toast.success("Enlace revocado.");
      onCerrar();
    });
  const activar = () =>
    iniciar(async () => {
      const r = await enlaceDocumento(tipo, id, false);
      if (!r.ok) return void avisoError(r.error);
      onToken(r.data.token);
    });

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enlace público</DialogTitle>
          <DialogDescription>
            Cualquiera con el enlace ve el documento sin iniciar sesión.{tipo === "ficha" ? " El mismo enlace va en el QR del PDF para verificar que es auténtica." : ""}
          </DialogDescription>
        </DialogHeader>
        {token ? (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Código QR del enlace" width={140} height={140} className="rounded-md border border-border" />
            ) : (
              <div className="size-[140px] animate-pulse rounded-md bg-secondary" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="break-all rounded-md bg-soft p-2 font-mono text-xs dark:bg-secondary/50">{url}</p>
              <p className="text-xs text-muted-foreground">{vistas === 1 ? "Abierto 1 vez." : `Abierto ${vistas} veces.`}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(url).then(
                      () => toast.success("Enlace copiado."),
                      () => avisoError("No se pudo copiar."),
                    );
                  }}
                >
                  <Copy /> Copiar
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={url} target="_blank" rel="noopener">
                    <ExternalLink /> Abrir
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">El enlace está revocado o aún no existe.</p>
        )}
        <DialogFooter>
          {token ? (
            <>
              <Button variant="ghost" onClick={revocar} disabled={pendiente}>
                <ShieldOff /> Revocar
              </Button>
              <Button variant="outline" onClick={renovar} disabled={pendiente}>
                <RefreshCw /> Generar uno nuevo
              </Button>
            </>
          ) : (
            <Button variant="mint" onClick={activar} disabled={pendiente}>
              <Link2 /> Activar enlace
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoMensaje({
  abierto,
  onCerrar,
  tipo,
  rutaWorkspace,
  numero,
  titular,
  token,
  empresa,
}: {
  abierto: boolean;
  onCerrar: () => void;
  tipo: Tipo;
  rutaWorkspace: string;
  numero: string | null;
  titular: string;
  token: string | null;
  empresa: Props["empresa"];
}) {
  const origen = useOrigen();
  const saludo = empresa.contacto ? `Hola ${empresa.contacto.split(" ")[0]}` : "Hola";
  const enlace = empresa.conWorkspace ? `${origen}/w/${empresa.slug}/${rutaWorkspace}` : token ? urlPortal(origen, token) : "";
  const nombre = NOMBRE_DOCUMENTO[tipo].toLowerCase();
  const detalle =
    tipo === "ficha"
      ? " con el detalle del servicio, el estado del equipo y las recomendaciones"
      : tipo === "acta"
        ? ". Revisa los entregables y, si todo está conforme, acéptala con tu nombre y DNI"
        : tipo === "informe"
          ? " con lo avanzado en el periodo. Si tienes comentarios, puedes dejarlos ahí mismo"
          : " para revisar juntos el alcance";
  const articulo = tipo === "ficha" || tipo === "acta" ? "la" : "el";
  const texto = enlace
    ? `${saludo}, te comparto ${articulo} ${nombre} ${numero} (${titular})${detalle}: ${enlace}`
    : `${saludo}, te comparto ${articulo} ${nombre} ${numero} (${titular}). Te adjunto el PDF.`;
  const telefono = (empresa.telefono ?? "").replace(/\D/g, "");
  const wa = telefono ? `https://wa.me/${telefono.length === 9 ? `51${telefono}` : telefono}?text=${encodeURIComponent(texto)}` : null;

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensaje para {empresa.nombre}</DialogTitle>
          <DialogDescription>
            {empresa.conWorkspace ? `El enlace lleva a ${tipo === "informe" ? "Informes" : "Documentos"} en su espacio.` : "El enlace abre el documento sin iniciar sesión."}
          </DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-line rounded-md bg-soft p-3 text-sm dark:bg-secondary/50">{texto}</p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              navigator.clipboard.writeText(texto).then(
                () => toast.success("Mensaje copiado."),
                () => avisoError("No se pudo copiar."),
              )
            }
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
