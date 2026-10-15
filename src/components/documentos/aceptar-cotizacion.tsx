"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import type { Resultado } from "@/lib/datos/resultado";

/**
 * Aceptar una cotización con nombre y DNI. La acción llega ya atada: desde el
 * workspace (ws_aceptar_cotizacion) o desde el portal por token (aceptar_cotizacion).
 */
export function AceptarCotizacion({
  aceptar: accion,
  total,
  contacto,
  textoExito = "¡Gracias! Cotización aceptada. Ya estamos en marcha.",
}: {
  aceptar: (input: { nombre: string; dni: string }) => Promise<Resultado<unknown>>;
  total: string;
  contacto: string | null;
  textoExito?: string;
}) {
  const [nombre, setNombre] = useState(contacto ?? "");
  const [dni, setDni] = useState("");
  const [conforme, setConforme] = useState(false);
  const [errores, setErrores] = useState<{ campo?: string; mensaje?: string }>({});
  const [pendiente, iniciar] = useTransition();

  const aceptar = () =>
    iniciar(async () => {
      setErrores({});
      const r = await accion({ nombre, dni });
      if (!r.ok) return setErrores({ campo: r.campo, mensaje: r.error });
      toast.success(textoExito);
    });

  return (
    <Card className="border-mint-ink/40">
      <CardHeader>
        <CardTitle>Aceptar esta cotización</CardTitle>
        <CardDescription>Por {total}. Al aceptar, empezamos a trabajar.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_160px]"
          onSubmit={(e) => {
            e.preventDefault();
            aceptar();
          }}
          noValidate
        >
          <Campo id="ws-nombre" etiqueta="Tu nombre completo" requerido error={errores.campo === "nombre" ? errores.mensaje : undefined}>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" {...propsCampo("ws-nombre", errores.campo === "nombre" ? errores.mensaje : undefined)} />
          </Campo>
          <Campo id="ws-dni" etiqueta="DNI" requerido error={errores.campo === "dni" ? errores.mensaje : undefined}>
            <Input
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              className="font-mono"
              {...propsCampo("ws-dni", errores.campo === "dni" ? errores.mensaje : undefined)}
            />
          </Campo>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-0.5 size-4 accent-mint-ink dark:accent-mint" checked={conforme} onChange={(e) => setConforme(e.target.checked)} />
            Revisé el detalle y las condiciones, y acepto la cotización.
          </label>
          {errores.mensaje && !errores.campo ? (
            <p role="alert" className="text-sm text-danger sm:col-span-2">
              {errores.mensaje}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" variant="mint" disabled={pendiente || !conforme}>
              {pendiente ? <Loader2 className="animate-spin" /> : <Check />} Aceptar cotización
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
