"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { MEDIOS_PAGO } from "@/lib/cotizacion";
import { formatearCentimos, formatearFecha, formatearMonto, hoyLima, type Moneda } from "@/lib/format";
import { cobroSchema, type CobroDatos, type CobroInput } from "@/lib/validators/cotizacion";
import type { MedioPago } from "@/types/database";
import { eliminarCobro, registrarCobro } from "./acciones";

const etiquetaMedio = (m: MedioPago) => MEDIOS_PAGO.find((x) => x.valor === m)?.etiqueta ?? m;

interface Props {
  clienteId: string;
  /** Cotización a la que se imputa el cobro (opcional en la ficha de empresa). */
  cotizacion?: { id: string; numero: string | null; moneda: Moneda; saldo: number };
  /** Para elegir la cotización desde la ficha de empresa. */
  opciones?: { id: string; numero: string | null; asunto: string }[];
  textoBoton?: string;
}

export function RegistrarCobro({ clienteId, cotizacion, opciones, textoBoton = "Registrar cobro" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [guardando, iniciar] = useTransition();
  const form = useForm<CobroInput, unknown, CobroDatos>({
    resolver: zodResolver(cobroSchema),
    defaultValues: {
      cliente_id: clienteId,
      cotizacion_id: cotizacion?.id ?? "",
      fecha: hoyLima(),
      monto: cotizacion && cotizacion.saldo > 0 ? formatearCentimos(cotizacion.saldo).replace(/\s/g, "") : "",
      moneda: cotizacion?.moneda ?? "PEN",
      medio: "transferencia",
      referencia: "",
      notas: "",
    },
  });
  const { register, handleSubmit, formState, reset } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      const r = await registrarCobro(datos);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Cobro registrado.");
      setAbierto(false);
      reset();
    }),
  );

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus /> {textoBoton}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar cobro</DialogTitle>
          <DialogDescription>
            {cotizacion ? `Para ${cotizacion.numero}. Saldo pendiente: ${formatearMonto(cotizacion.saldo, cotizacion.moneda)}.` : "Un adelanto, una cuota o el pago final."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
          {opciones ? (
            <Campo id="cobro-cot" etiqueta="Cotización" className="sm:col-span-2" ayuda="Opcional: a qué cotización corresponde.">
              <Select {...register("cotizacion_id")} {...propsCampo("cobro-cot", undefined, "si")}>
                <option value="">Sin cotización</option>
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero} · {o.asunto}
                  </option>
                ))}
              </Select>
            </Campo>
          ) : null}
          <Campo id="cobro-monto" etiqueta="Monto" requerido error={e.monto?.message}>
            <Input {...register("monto")} {...propsCampo("cobro-monto", e.monto?.message)} inputMode="decimal" className="font-mono" autoFocus />
          </Campo>
          <Campo id="cobro-fecha" etiqueta="Fecha" error={e.fecha?.message}>
            <Input {...register("fecha")} {...propsCampo("cobro-fecha", e.fecha?.message)} type="date" className="font-mono" />
          </Campo>
          <Campo id="cobro-medio" etiqueta="Medio">
            <Select {...register("medio")} {...propsCampo("cobro-medio")}>
              {MEDIOS_PAGO.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="cobro-moneda" etiqueta="Moneda">
            <Select {...register("moneda")} {...propsCampo("cobro-moneda")}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </Select>
          </Campo>
          <Campo id="cobro-ref" etiqueta="Referencia" error={e.referencia?.message} className="sm:col-span-2" ayuda="N° de operación, quién pagó…">
            <Input {...register("referencia")} {...propsCampo("cobro-ref", e.referencia?.message, "si")} className="font-mono" />
          </Campo>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="mint" disabled={guardando}>
              {guardando ? <Loader2 className="animate-spin" /> : <Wallet />} Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ListaCobros({
  cobros,
}: {
  cobros: { id: string; fecha: string; monto: number; moneda: Moneda; medio: MedioPago; referencia: string | null; cotizacion?: string | null }[];
}) {
  const [pendiente, iniciar] = useTransition();
  if (cobros.length === 0) return <p className="text-sm text-muted-foreground">Sin cobros registrados.</p>;
  return (
    <ul className="divide-y divide-border">
      {cobros.map((k) => (
        <li key={k.id} className="group flex items-center justify-between gap-3 py-2 text-sm">
          <div className="min-w-0">
            <p className="font-mono tabular">{formatearMonto(k.monto, k.moneda)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {formatearFecha(k.fecha)} · {etiquetaMedio(k.medio)}
              {k.referencia ? ` · ${k.referencia}` : ""}
              {k.cotizacion ? ` · ${k.cotizacion}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Eliminar cobro"
            disabled={pendiente}
            onClick={() => {
              if (!window.confirm("¿Eliminar este cobro?")) return;
              iniciar(async () => {
                const r = await eliminarCobro(k.id);
                if (!r.ok) toast.error(r.error);
                else toast.success("Cobro eliminado.");
              });
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
