"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import QRCode from "qrcode";
import { Copy, ExternalLink, FileDown, Link2, Loader2, MessageCircle, MoreHorizontal, Pencil, RefreshCw, Send, ShieldOff, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { urlPortal } from "@/lib/documentos";
import { enlaceDocumento, publicarFicha, revocarEnlace } from "../acciones";

interface Props {
  id: string;
  numero: string | null;
  titular: string;
  publicada: boolean;
  token: string | null;
  vistas: number;
  empresa: { nombre: string; contacto: string | null; telefono: string | null; slug: string | null; conWorkspace: boolean };
}

/** Publicar, PDF, enlace público con QR, mensaje para WhatsApp y edición. */
export function AccionesFicha({ id, numero, titular, publicada, token: tokenInicial, vistas, empresa }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [token, setToken] = useState(tokenInicial);
  const [dialogo, setDialogo] = useState<"enlace" | "mensaje" | null>(null);

  const publicar = (valor: boolean) =>
    iniciar(async () => {
      const r = await publicarFicha(id, valor);
      if (!r.ok) return void toast.error(r.error);
      if (r.data.token) setToken(r.data.token);
      toast.success(valor ? "Publicada: la empresa la ve y el enlace con QR está activo." : "Volvió a borrador: el enlace deja de mostrarla.");
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
        <Button asChild variant="outline">
          <a href={`/panel/fichas/${id}/pdf`} target="_blank" rel="noopener">
            <FileDown /> PDF
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/panel/fichas/${id}/editar`}>
            <Pencil /> Editar
          </Link>
        </Button>
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
              <a href={`/panel/fichas/${id}/pdf?descargar=1`}>
                <FileDown /> Descargar PDF
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DialogoEnlace abierto={dialogo === "enlace"} onCerrar={() => setDialogo(null)} id={id} token={token} vistas={vistas} onToken={setToken} />
      <DialogoMensajeFicha abierto={dialogo === "mensaje"} onCerrar={() => setDialogo(null)} id={id} numero={numero} titular={titular} token={token} empresa={empresa} />
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
  id,
  token,
  vistas,
  onToken,
}: {
  abierto: boolean;
  onCerrar: () => void;
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
      const r = await enlaceDocumento("ficha", id, true);
      if (!r.ok) return void toast.error(r.error);
      onToken(r.data.token);
      toast.success("Enlace nuevo generado. Descarga el PDF otra vez para que lleve el QR nuevo.");
    });
  const revocar = () =>
    iniciar(async () => {
      if (!window.confirm("Nadie podrá abrir la ficha con el enlace ni con el QR. ¿Revocar?")) return;
      const r = await revocarEnlace("ficha", id);
      if (!r.ok) return void toast.error(r.error);
      onToken(null);
      toast.success("Enlace revocado.");
      onCerrar();
    });
  const activar = () =>
    iniciar(async () => {
      const r = await enlaceDocumento("ficha", id, false);
      if (!r.ok) return void toast.error(r.error);
      onToken(r.data.token);
    });

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enlace público</DialogTitle>
          <DialogDescription>Cualquiera con el enlace ve la ficha sin iniciar sesión. El mismo enlace va en el QR del PDF para verificar que es auténtica.</DialogDescription>
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
                      () => toast.error("No se pudo copiar."),
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

function DialogoMensajeFicha({
  abierto,
  onCerrar,
  id,
  numero,
  titular,
  token,
  empresa,
}: {
  abierto: boolean;
  onCerrar: () => void;
  id: string;
  numero: string | null;
  titular: string;
  token: string | null;
  empresa: Props["empresa"];
}) {
  const origen = useOrigen();
  const saludo = empresa.contacto ? `Hola ${empresa.contacto.split(" ")[0]}` : "Hola";
  const enlace = empresa.conWorkspace ? `${origen}/w/${empresa.slug}/documentos/${id}` : token ? urlPortal(origen, token) : "";
  const texto = enlace
    ? `${saludo}, te comparto la ficha técnica ${numero} (${titular}) con el detalle del servicio, el estado del equipo y las recomendaciones: ${enlace}`
    : `${saludo}, te comparto la ficha técnica ${numero} (${titular}). Te adjunto el PDF.`;
  const telefono = (empresa.telefono ?? "").replace(/\D/g, "");
  const wa = telefono ? `https://wa.me/${telefono.length === 9 ? `51${telefono}` : telefono}?text=${encodeURIComponent(texto)}` : null;

  return (
    <Dialog open={abierto} onOpenChange={(o) => (o ? null : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensaje para {empresa.nombre}</DialogTitle>
          <DialogDescription>{empresa.conWorkspace ? "El enlace la lleva a Documentos en su espacio." : "El enlace abre la ficha sin iniciar sesión."}</DialogDescription>
        </DialogHeader>
        <p className="whitespace-pre-line rounded-md bg-soft p-3 text-sm dark:bg-secondary/50">{texto}</p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              navigator.clipboard.writeText(texto).then(
                () => toast.success("Mensaje copiado."),
                () => toast.error("No se pudo copiar."),
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
