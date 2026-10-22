"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { BarraAcciones } from "@/components/formulario/barra-acciones";
import { useAvisoCambios } from "@/components/formulario/use-aviso-cambios";
import { usePanelLateral } from "@/components/panel/panel-lateral";
import { AREAS, ESTADOS_TRABAJO, PRIORIDADES } from "@/lib/areas";
import { formatearCentimos } from "@/lib/format";
import { abrirCreado } from "@/lib/navegacion";
import { trabajoSchema, type TrabajoDatos, type TrabajoInput } from "@/lib/validators/trabajo";
import type { TrabajoRow } from "@/types/database";
import { guardarTrabajo } from "./acciones";

interface Props {
  trabajo?: TrabajoRow;
  clientes: { id: string; nombre: string }[];
  clienteInicial?: string;
  areaInicial?: TrabajoInput["area"];
}

export function FormularioTrabajo({ trabajo, clientes, clienteInicial, areaInicial }: Props) {
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<TrabajoInput, unknown, TrabajoDatos>({
    resolver: zodResolver(trabajoSchema),
    defaultValues: {
      area: trabajo?.area ?? areaInicial ?? "desarrollo",
      cliente_id: trabajo?.cliente_id ?? clienteInicial ?? "",
      titulo: trabajo?.titulo ?? "",
      descripcion: trabajo?.descripcion ?? "",
      estado: trabajo?.estado ?? "propuesta",
      prioridad: trabajo?.prioridad ?? "media",
      fecha_inicio: trabajo?.fecha_inicio ?? "",
      fecha_compromiso: trabajo?.fecha_compromiso ?? "",
      monto_estimado_texto: trabajo?.monto_estimado != null ? formatearCentimos(trabajo.monto_estimado).replace(/\s/g, "") : "",
      moneda: trabajo?.moneda ?? "PEN",
      notas: trabajo?.notas ?? "",
    },
  });
  const { register, handleSubmit, formState, setError } = form;
  const errores = formState.errors;
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarTrabajo(datos, trabajo?.id);
      if (!r.ok) {
        if (r.campo && r.campo in datos) setError(r.campo as keyof TrabajoInput, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success(trabajo ? "Trabajo actualizado." : "Trabajo creado.");
      form.reset(datos as TrabajoInput, { keepValues: true });
      // Al editar se vuelve al detalle; un trabajo nuevo se abre con una carga normal (B-01).
      if (panel && trabajo) panel.cerrar(true);
      else abrirCreado(`/panel/trabajos/${r.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Qué es</CardTitle>
          <CardDescription>Área, cliente y un título claro. La descripción es para ti; lo que verá la empresa se decide con el interruptor Visible en el workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="area" etiqueta="Área" requerido error={errores.area?.message}>
            <Select {...register("area")} {...propsCampo("area", errores.area?.message)}>
              {AREAS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="cliente_id" etiqueta="Cliente" error={errores.cliente_id?.message} ayuda="Opcional: trabajos propios o sin cliente aún.">
            <Select {...register("cliente_id")} {...propsCampo("cliente_id", errores.cliente_id?.message, "si")}>
              <option value="">Sin cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="titulo" etiqueta="Título" requerido error={errores.titulo?.message} className="sm:col-span-2">
            <Input {...register("titulo")} {...propsCampo("titulo", errores.titulo?.message)} autoFocus placeholder="Rediseño del sitio web de SGC" />
          </Campo>
          <Campo id="descripcion" etiqueta="Descripción" error={errores.descripcion?.message} className="sm:col-span-2">
            <Textarea {...register("descripcion")} {...propsCampo("descripcion", errores.descripcion?.message)} rows={4} placeholder="Qué se va a hacer, alcance, contexto." />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguimiento</CardTitle>
          <CardDescription>Estado, prioridad y fechas. La fecha comprometida alimenta los vencimientos del inicio.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo id="estado" etiqueta="Estado" error={errores.estado?.message}>
            <Select {...register("estado")} {...propsCampo("estado", errores.estado?.message)}>
              {ESTADOS_TRABAJO.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="prioridad" etiqueta="Prioridad" error={errores.prioridad?.message}>
            <Select {...register("prioridad")} {...propsCampo("prioridad", errores.prioridad?.message)}>
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="fecha_inicio" etiqueta="Inicio" error={errores.fecha_inicio?.message}>
            <Input {...register("fecha_inicio")} {...propsCampo("fecha_inicio", errores.fecha_inicio?.message)} type="date" className="font-mono" />
          </Campo>
          <Campo id="fecha_compromiso" etiqueta="Fecha comprometida" error={errores.fecha_compromiso?.message}>
            <Input {...register("fecha_compromiso")} {...propsCampo("fecha_compromiso", errores.fecha_compromiso?.message)} type="date" className="font-mono" />
          </Campo>
          <Campo id="monto" etiqueta="Monto estimado" error={errores.monto_estimado_texto?.message} ayuda="Sin IGV; la cotización lo precisa.">
            <Input {...register("monto_estimado_texto")} {...propsCampo("monto", errores.monto_estimado_texto?.message, "si")} inputMode="decimal" placeholder="1500,00" className="font-mono" />
          </Campo>
          <Campo id="moneda" etiqueta="Moneda" error={errores.moneda?.message}>
            <Select {...register("moneda")} {...propsCampo("moneda", errores.moneda?.message)}>
              <option value="PEN">Soles (S/)</option>
              <option value="USD">Dólares (US$)</option>
            </Select>
          </Campo>
          <Campo id="notas" etiqueta="Notas internas" error={errores.notas?.message} className="sm:col-span-2">
            <Textarea {...register("notas")} {...propsCampo("notas", errores.notas?.message)} rows={2} />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones
        guardando={guardando}
        textoGuardar={trabajo ? "Guardar cambios" : "Crear trabajo"}
        hrefCancelar={trabajo ? `/panel/trabajos/${trabajo.id}` : "/panel/trabajos"}
        error={errorGeneral}
      />
    </form>
  );
}
