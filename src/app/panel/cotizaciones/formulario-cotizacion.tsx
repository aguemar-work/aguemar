"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { BarraAcciones } from "@/components/formulario/barra-acciones";
import { useAvisoCambios } from "@/components/formulario/use-aviso-cambios";
import { usePanelLateral } from "@/components/panel/panel-lateral";
import { AREAS } from "@/lib/areas";
import { aCentimos, formatearCentimos, formatearMonto, hoyLima } from "@/lib/format";
import { aCantidad, calcularTotales, fechaVence, importeLinea } from "@/lib/cotizacion";
import { basisAPorcentaje } from "@/lib/validators/marca";
import { cotizacionSchema, type CotizacionDatos, type CotizacionInput, type LineaInput } from "@/lib/validators/cotizacion";
import type { CotizacionItemRow, CotizacionRow, PerfilMarcaRow, ServicioRow } from "@/types/database";
import { guardarCotizacion } from "./acciones";
import { SelectorServicios } from "./selector-servicios";

interface Props {
  cotizacion?: CotizacionRow & { cotizacion_items: CotizacionItemRow[] };
  clientes: { id: string; nombre: string }[];
  servicios: ServicioRow[];
  marca: PerfilMarcaRow | null;
  clienteInicial?: string;
}

const aTexto = (centimos: number) => formatearCentimos(centimos).replace(/\s/g, "");

/** Céntimos de un texto de precio, o 0 si aún no es válido (para la vista previa). */
function centimosSeguro(texto: string | undefined): number {
  if (!texto) return 0;
  try {
    return Math.max(aCentimos(texto), 0);
  } catch {
    return 0;
  }
}

const lineaVacia: LineaInput = { servicio_id: "", descripcion: "", unidad: "servicio", cantidad: "1", precio: "", descuento: "" };

export function FormularioCotizacion({ cotizacion, clientes, servicios, marca, clienteInicial }: Props) {
  const router = useRouter();
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<CotizacionInput, unknown, CotizacionDatos>({
    resolver: zodResolver(cotizacionSchema),
    defaultValues: {
      cliente_id: cotizacion?.cliente_id ?? clienteInicial ?? "",
      area: cotizacion?.area ?? "desarrollo",
      asunto: cotizacion?.asunto ?? "",
      fecha: cotizacion?.fecha ?? hoyLima(),
      validez_dias: cotizacion?.validez_dias ?? marca?.validez_dias_default ?? 15,
      moneda: cotizacion?.moneda ?? marca?.moneda_default ?? "PEN",
      igv_modo: cotizacion?.igv_modo ?? "sumar",
      igv_porcentaje: basisAPorcentaje(cotizacion?.igv_pct ?? marca?.igv_pct ?? 1800),
      condiciones: cotizacion?.condiciones ?? marca?.condiciones_default ?? "",
      notas: cotizacion?.notas ?? "",
      items: cotizacion?.cotizacion_items.length
        ? cotizacion.cotizacion_items.map((i) => ({
            servicio_id: i.servicio_id ?? "",
            descripcion: i.descripcion,
            unidad: i.unidad,
            cantidad: String(Number(i.cantidad)).replace(".", ","),
            precio: aTexto(i.precio_unitario),
            descuento: i.descuento ? aTexto(i.descuento) : "",
          }))
        : [],
    },
  });
  const { register, handleSubmit, formState, setError, watch, control } = form;
  const errores = formState.errors;
  const { fields, append, remove, move } = useFieldArray({ control, name: "items" });
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);

  const valores = watch();
  const importes = (valores.items ?? []).map((l) => importeLinea(aCantidad(l.cantidad ?? ""), centimosSeguro(l.precio), centimosSeguro(l.descuento)));
  const igvPct = Math.round((Number(valores.igv_porcentaje) || 0) * 100);
  const totales = calcularTotales(importes, igvPct, valores.igv_modo ?? "sumar");
  const moneda = valores.moneda ?? "PEN";

  const agregarServicio = (s: ServicioRow) => {
    append({
      servicio_id: s.id,
      descripcion: s.descripcion ? `${s.nombre}\n${s.descripcion}` : s.nombre,
      unidad: s.unidad,
      cantidad: "1",
      precio: s.precio_base != null ? aTexto(s.precio_base) : "",
      descuento: "",
    });
    // Si aún no hay asunto ni área elegida a mano, el primer servicio los sugiere.
    if (!form.getValues("asunto")) form.setValue("asunto", s.nombre, { shouldDirty: true });
    if (fields.length === 0) form.setValue("area", s.area, { shouldDirty: true });
  };

  const onSubmit = handleSubmit((datos) => {
    // Editar una cotización ya enviada la devuelve a borrador con una versión más (la base lo hace).
    if (cotizacion?.estado === "enviada" && !window.confirm(`Esta cotización ya se envió. Pasará a borrador v${cotizacion.version + 1} y tendrás que reenviarla (el enlace y el PDF anteriores dejan de valer). ¿Continuar?`)) return;
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarCotizacion(datos, cotizacion?.id);
      if (!r.ok) {
        if (r.campo) setError(r.campo as FieldPath<CotizacionInput>, { message: r.error });
        setErrorGeneral(r.error);
        return;
      }
      toast.success(cotizacion ? (cotizacion.estado === "enviada" ? `Guardada como borrador v${cotizacion.version + 1}: reenvíala para que la empresa vea los cambios.` : "Cotización actualizada.") : "Cotización guardada como borrador.");
      form.reset(datos as CotizacionInput, { keepValues: true });
      if (panel && cotizacion) panel.cerrar(true);
      else if (panel) router.replace(`/panel/cotizaciones/${r.data.id}`);
      else router.push(`/panel/cotizaciones/${r.data.id}`);
    });
  });

  const errorItems = errores.items?.message ?? errores.items?.root?.message;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Para quién</CardTitle>
          <CardDescription>
            Vence el{" "}
            <span className="font-mono">
              {valores.fecha && valores.validez_dias ? fechaVence(valores.fecha, Number(valores.validez_dias)).split("-").reverse().join("/") : "—"}
            </span>
            . Al aceptarse se crea el trabajo con este asunto y área.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo id="cliente_id" etiqueta="Empresa" requerido error={errores.cliente_id?.message} className="sm:col-span-2">
            <Select {...register("cliente_id")} {...propsCampo("cliente_id", errores.cliente_id?.message)}>
              <option value="">Elige la empresa</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="area" etiqueta="Área" requerido error={errores.area?.message}>
            <Select {...register("area")} {...propsCampo("area", errores.area?.message)}>
              {AREAS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="moneda" etiqueta="Moneda" error={errores.moneda?.message}>
            <Select {...register("moneda")} {...propsCampo("moneda", errores.moneda?.message)}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </Select>
          </Campo>
          <Campo id="asunto" etiqueta="Asunto" requerido error={errores.asunto?.message} className="sm:col-span-2">
            <Input {...register("asunto")} {...propsCampo("asunto", errores.asunto?.message)} placeholder="Página web corporativa" />
          </Campo>
          <Campo id="fecha" etiqueta="Fecha" error={errores.fecha?.message}>
            <Input {...register("fecha")} {...propsCampo("fecha", errores.fecha?.message)} type="date" className="font-mono" />
          </Campo>
          <Campo id="validez_dias" etiqueta="Validez (días)" error={errores.validez_dias?.message}>
            <Input {...register("validez_dias", { valueAsNumber: true })} {...propsCampo("validez_dias", errores.validez_dias?.message)} type="number" min={1} className="font-mono" />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Líneas</CardTitle>
            <CardDescription>Elige de tu catálogo o escribe una línea libre. Todo es editable.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <SelectorServicios servicios={servicios} onElegir={agregarServicio} />
            <Button type="button" variant="outline" onClick={() => append(lineaVacia)}>
              <Plus /> Línea libre
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sin líneas todavía. Empieza con <strong>Desde mis servicios</strong>.
            </p>
          ) : null}
          {errorItems ? (
            <p role="alert" className="text-sm text-danger">
              {errorItems}
            </p>
          ) : null}

          {fields.map((f, i) => {
            const e = errores.items?.[i];
            const id = (c: string) => `items-${i}-${c}`;
            return (
              <div key={f.id} className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-mint-ink dark:text-mint">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Subir línea" disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Bajar línea" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Quitar línea ${i + 1}`} onClick={() => remove(i)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-6">
                  <Campo id={id("descripcion")} etiqueta="Descripción" error={e?.descripcion?.message} className="sm:col-span-6">
                    <Textarea {...register(`items.${i}.descripcion`)} {...propsCampo(id("descripcion"), e?.descripcion?.message)} rows={2} placeholder="Qué incluye esta línea" />
                  </Campo>
                  <Campo id={id("cantidad")} etiqueta="Cantidad" error={e?.cantidad?.message}>
                    <Input {...register(`items.${i}.cantidad`)} {...propsCampo(id("cantidad"), e?.cantidad?.message)} inputMode="decimal" className="font-mono" />
                  </Campo>
                  <Campo id={id("unidad")} etiqueta="Unidad" error={e?.unidad?.message}>
                    <Input {...register(`items.${i}.unidad`)} {...propsCampo(id("unidad"), e?.unidad?.message)} />
                  </Campo>
                  <Campo id={id("precio")} etiqueta="Precio unit." error={e?.precio?.message}>
                    <Input {...register(`items.${i}.precio`)} {...propsCampo(id("precio"), e?.precio?.message)} inputMode="decimal" placeholder="0,00" className="font-mono" />
                  </Campo>
                  <Campo id={id("descuento")} etiqueta="Descuento" error={e?.descuento?.message}>
                    <Input {...register(`items.${i}.descuento`)} {...propsCampo(id("descuento"), e?.descuento?.message)} inputMode="decimal" placeholder="0,00" className="font-mono" />
                  </Campo>
                  <div className="space-y-1.5 sm:col-span-2">
                    <p className="text-sm font-medium">Importe</p>
                    <p className="flex h-10 items-center justify-end rounded-md bg-soft px-3 font-mono text-sm tabular dark:bg-secondary/50">{formatearMonto(importes[i] ?? 0, moneda)}</p>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="ml-auto max-w-sm space-y-2 rounded-md border border-border p-4">
            <div className="grid grid-cols-2 gap-3">
              <Campo id="igv_modo" etiqueta="IGV" error={errores.igv_modo?.message}>
                <Select {...register("igv_modo")} {...propsCampo("igv_modo", errores.igv_modo?.message)}>
                  <option value="sumar">Se suma</option>
                  <option value="incluido">Incluido</option>
                </Select>
              </Campo>
              <Campo id="igv_porcentaje" etiqueta="IGV (%)" error={errores.igv_porcentaje?.message}>
                <Input {...register("igv_porcentaje", { valueAsNumber: true })} {...propsCampo("igv_porcentaje", errores.igv_porcentaje?.message)} type="number" step="any" className="font-mono" />
              </Campo>
            </div>
            <dl className="space-y-1 pt-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-mono tabular">{formatearMonto(totales.subtotal, moneda)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IGV {valores.igv_porcentaje || 0} %</dt>
                <dd className="font-mono tabular">{formatearMonto(totales.igv, moneda)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-mono tabular" aria-live="polite">
                  {formatearMonto(totales.total, moneda)}
                </dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condiciones y notas</CardTitle>
          <CardDescription>Las condiciones salen en el PDF; las notas internas solo las ves tú.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="condiciones" etiqueta="Condiciones" error={errores.condiciones?.message} ayuda="Una por línea: forma de pago, plazos, qué no incluye.">
            <Textarea {...register("condiciones")} {...propsCampo("condiciones", errores.condiciones?.message, "si")} rows={5} />
          </Campo>
          <Campo id="notas" etiqueta="Notas internas" error={errores.notas?.message}>
            <Textarea {...register("notas")} {...propsCampo("notas", errores.notas?.message)} rows={5} />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones
        guardando={guardando}
        textoGuardar={cotizacion ? "Guardar cambios" : "Guardar borrador"}
        hrefCancelar={cotizacion ? `/panel/cotizaciones/${cotizacion.id}` : "/panel/cotizaciones"}
        error={errorGeneral}
      />
    </form>
  );
}
