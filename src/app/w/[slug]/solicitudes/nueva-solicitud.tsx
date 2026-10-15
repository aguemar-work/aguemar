"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { AREAS } from "@/lib/areas";
import { hoyLima } from "@/lib/format";
import { solicitarEmpresa } from "../acciones";

const VACIO = { titulo: "", descripcion: "", area: "", prioridad: "media" as const, fecha_deseada: "" };

/** Formulario corto para que la empresa pida un trabajo. */
export function NuevaSolicitud({ slug }: { slug: string }) {
  const [v, setV] = useState<{ titulo: string; descripcion: string; area: string; prioridad: "baja" | "media" | "alta"; fecha_deseada: string }>(VACIO);
  const [error, setError] = useState<{ campo?: string; mensaje?: string }>({});
  const [pendiente, iniciar] = useTransition();

  const enviar = () =>
    iniciar(async () => {
      setError({});
      const r = await solicitarEmpresa(slug, { ...v, area: v.area as "" | "diseno" | "desarrollo" | "soporte" });
      if (!r.ok) return setError({ campo: r.campo, mensaje: r.error });
      toast.success("Solicitud enviada. Te respondemos pronto.");
      setV(VACIO);
    });
  const errorDe = (campo: string) => (error.campo === campo ? error.mensaje : undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>¿Qué necesitas?</CardTitle>
        <CardDescription>Cuéntanos el pedido; lo revisamos y te respondemos aquí mismo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <Campo id="sol-titulo" etiqueta="Pedido" requerido error={errorDe("titulo")} className="sm:col-span-3">
            <Input value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })} placeholder="Instalar impresora en recepción" {...propsCampo("sol-titulo", errorDe("titulo"))} />
          </Campo>
          <Campo id="sol-desc" etiqueta="Detalle" ayuda="Opcional: qué pasa, desde cuándo, dónde." className="sm:col-span-3">
            <Textarea value={v.descripcion} onChange={(e) => setV({ ...v, descripcion: e.target.value })} rows={3} {...propsCampo("sol-desc", undefined, "si")} />
          </Campo>
          <Campo id="sol-area" etiqueta="Tipo">
            <Select value={v.area} onChange={(e) => setV({ ...v, area: e.target.value })} {...propsCampo("sol-area")}>
              <option value="">No sé</option>
              {AREAS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="sol-prioridad" etiqueta="Urgencia">
            <Select value={v.prioridad} onChange={(e) => setV({ ...v, prioridad: e.target.value as "baja" | "media" | "alta" })} {...propsCampo("sol-prioridad")}>
              <option value="baja">Puede esperar</option>
              <option value="media">Normal</option>
              <option value="alta">Urgente</option>
            </Select>
          </Campo>
          <Campo id="sol-fecha" etiqueta="Para cuándo" error={errorDe("fecha_deseada")} ayuda="Opcional">
            <Input type="date" min={hoyLima()} value={v.fecha_deseada} onChange={(e) => setV({ ...v, fecha_deseada: e.target.value })} className="font-mono" {...propsCampo("sol-fecha", errorDe("fecha_deseada"), "si")} />
          </Campo>
          {error.mensaje && !error.campo ? (
            <p role="alert" className="text-sm text-danger sm:col-span-3">
              {error.mensaje}
            </p>
          ) : null}
          <div className="sm:col-span-3">
            <Button type="submit" variant="mint" disabled={pendiente || v.titulo.trim().length < 3}>
              {pendiente ? <Loader2 className="animate-spin" /> : <Send />} Enviar solicitud
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
