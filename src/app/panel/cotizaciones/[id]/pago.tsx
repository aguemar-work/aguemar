"use client";

import { useOptimistic, useState, useTransition } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ETIQUETA_RECORDATORIO, estadoPago } from "@/lib/cotizacion";
import { formatearFecha, formatearFechaHora, formatearMonto, type Moneda } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RecordatorioCobroRow } from "@/types/database";
import { actualizarPagoCotizacion } from "../acciones";

const TONO = {
  ok: "bg-success-bg text-success-foreground",
  warn: "bg-warning-bg text-warning-foreground",
  danger: "bg-danger-soft text-danger dark:bg-danger/20 dark:text-red-200",
} as const;

interface Props {
  id: string;
  aceptada: boolean;
  plazo: number;
  recordar: boolean;
  moneda: Moneda;
  hoy: string;
  /** Solo si está aceptada: lo que calcula deudas_cotizacion(). */
  deuda: { pendiente: number; vence_pago: string } | null;
  /** Saldo con solo los cobros ligados a esta cotización, para avisar si difiere. */
  saldoLigado: number;
  recordatorios: Pick<RecordatorioCobroRow, "id" | "tipo" | "pendiente" | "moneda" | "correo" | "created_at">[];
  /** La empresa tiene los avisos por correo desactivados o no tiene correo. */
  sinAvisos: boolean;
}

/** Plazo de pago, vencimiento y recordatorios de una cotización. */
export function PagoCotizacion({ id, aceptada, plazo, recordar, moneda, hoy, deuda, saldoLigado, recordatorios, sinAvisos }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [recordarVista, setRecordarVista] = useOptimistic(recordar);
  const [dias, setDias] = useState(String(plazo));
  const [error, setError] = useState<string>();
  const cambiado = dias.trim() !== String(plazo);

  const alternar = (valor: boolean) =>
    iniciar(async () => {
      setRecordarVista(valor);
      const r = await actualizarPagoCotizacion(id, { recordar_pago: valor });
      if (!r.ok) toast.error(r.error);
      else toast.success(valor ? "Recordatorios activados." : "Recordatorios pausados.");
    });

  const guardarPlazo = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(dias);
    if (!/^\d+$/.test(dias.trim()) || n > 120) {
      setError("Escribe de 0 a 120 días.");
      return;
    }
    iniciar(async () => {
      setError(undefined);
      const r = await actualizarPagoCotizacion(id, { plazo_pago_dias: n });
      if (!r.ok) setError(r.error);
      else toast.success("Plazo de pago guardado.");
    });
  };

  const estado = deuda ? estadoPago(deuda, hoy) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Pago</CardTitle>
        <CardDescription>{aceptada ? "Vence a los días de plazo desde que la aceptaron." : "El plazo empieza a correr cuando la acepten."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {deuda && estado ? (
          <div className={cn("rounded-md p-3 text-sm", TONO[estado.tono])}>
            <p className="font-medium">{estado.texto}</p>
            {deuda.pendiente > 0 ? (
              <p className="mt-0.5 text-xs">
                <span className="font-mono tabular">{formatearMonto(deuda.pendiente, moneda)}</span> pendiente · fecha de pago <span className="font-mono">{formatearFecha(deuda.vence_pago)}</span>
              </p>
            ) : null}
            {deuda.pendiente !== saldoLigado ? (
              <p className="mt-1 text-xs opacity-90">Incluye cobros de la empresa sin cotización, que se aplican primero a lo que vence antes.</p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={guardarPlazo} className="space-y-1">
          <label htmlFor={`plazo-${id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
            Plazo de pago (días)
          </label>
          <div className="flex gap-2">
            <Input
              id={`plazo-${id}`}
              inputMode="numeric"
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `plazo-${id}-error` : undefined}
              className="w-24 font-mono"
            />
            {cambiado ? (
              <Button type="submit" size="sm" variant="outline" disabled={pendiente} className="h-9">
                {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
                Guardar
              </Button>
            ) : null}
          </div>
          {error ? (
            <p id={`plazo-${id}-error`} role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </form>

        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" id={`recordar-${id}`}>
              Recordar pago
            </p>
            <p className="text-xs text-muted-foreground">
              Correo a la empresa 3 días antes, al vencer y a los 7 días de atraso.
              {sinAvisos ? " Esta empresa no recibe avisos por correo: actívalos en su ficha." : ""}
            </p>
          </div>
          <Switch checked={recordarVista} onCheckedChange={alternar} disabled={pendiente} aria-labelledby={`recordar-${id}`} />
        </div>

        {recordatorios.length ? (
          <div>
            <h3 className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Recordatorios enviados</h3>
            <ul className="divide-y divide-border text-sm">
              {recordatorios.map((r) => (
                <li key={r.id} className="py-2">
                  <p className="flex justify-between gap-2">
                    <span>{ETIQUETA_RECORDATORIO[r.tipo]}</span>
                    <span className="font-mono text-xs tabular">{formatearMonto(r.pendiente, r.moneda)}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{formatearFechaHora(r.created_at)}</span> · {r.correo}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
