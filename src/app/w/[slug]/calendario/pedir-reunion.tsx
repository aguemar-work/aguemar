"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { hoyLima } from "@/lib/format";
import { pedirReunion } from "../acciones";

const VACIO = { tema: "", detalle: "", fecha: "", hora: "", modalidad: "virtual" as "virtual" | "presencial" };

/** Botón y formulario corto para que la empresa pida una reunión; el propietario la confirma. */
export function PedirReunion({ slug }: { slug: string }) {
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState(VACIO);
  const [error, setError] = useState<{ campo?: string; mensaje?: string }>({});
  const [pendiente, iniciar] = useTransition();
  const errorDe = (campo: string) => (error.campo === campo ? error.mensaje : undefined);

  const enviar = () =>
    iniciar(async () => {
      setError({});
      const r = await pedirReunion(slug, v);
      if (!r.ok) return setError({ campo: r.campo, mensaje: r.error });
      toast.success("Pedido enviado. Te confirmamos el horario por aquí y por correo.");
      setV(VACIO);
      setAbierto(false);
    });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="mint" size="sm" className="self-start">
          <CalendarPlus /> Pedir una reunión
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pedir una reunión</DialogTitle>
          <DialogDescription>Dinos qué día y a qué hora te acomoda. Lo revisamos y te confirmamos, o te proponemos otro horario.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <Campo id="reu-tema" etiqueta="¿De qué quieres hablar?" requerido error={errorDe("tema")} className="sm:col-span-2">
            <Input value={v.tema} onChange={(e) => setV({ ...v, tema: e.target.value })} placeholder="Revisar el avance de la web" {...propsCampo("reu-tema", errorDe("tema"))} />
          </Campo>
          <Campo id="reu-detalle" etiqueta="Detalle" ayuda="Opcional: qué quieres ver o decidir." className="sm:col-span-2">
            <Textarea value={v.detalle} onChange={(e) => setV({ ...v, detalle: e.target.value })} rows={3} {...propsCampo("reu-detalle", undefined, "si")} />
          </Campo>
          <Campo id="reu-fecha" etiqueta="Día" requerido error={errorDe("fecha")}>
            <Input type="date" min={hoyLima()} value={v.fecha} onChange={(e) => setV({ ...v, fecha: e.target.value })} className="font-mono" {...propsCampo("reu-fecha", errorDe("fecha"))} />
          </Campo>
          <Campo id="reu-hora" etiqueta="Hora" ayuda="Opcional">
            <Input type="time" value={v.hora} onChange={(e) => setV({ ...v, hora: e.target.value })} className="font-mono" {...propsCampo("reu-hora", undefined, "si")} />
          </Campo>
          <Campo id="reu-modalidad" etiqueta="Modalidad" className="sm:col-span-2">
            <Select value={v.modalidad} onChange={(e) => setV({ ...v, modalidad: e.target.value as "virtual" | "presencial" })} {...propsCampo("reu-modalidad")}>
              <option value="virtual">Virtual (videollamada)</option>
              <option value="presencial">Presencial</option>
            </Select>
          </Campo>
          {error.mensaje && !error.campo ? (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {error.mensaje}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="mint" disabled={pendiente || v.tema.trim().length < 3 || !v.fecha}>
              {pendiente ? <Loader2 className="animate-spin" /> : <Send />} Enviar pedido
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
