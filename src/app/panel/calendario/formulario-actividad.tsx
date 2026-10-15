"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { BarraAcciones } from "@/components/formulario/barra-acciones";
import { useAvisoCambios } from "@/components/formulario/use-aviso-cambios";
import { usePanelLateral } from "@/components/panel/panel-lateral";
import { ESTADOS_ACTIVIDAD, TIPOS_ACTIVIDAD } from "@/lib/calendario";
import { hoyLima } from "@/lib/format";
import { actividadSchema, type ActividadDatos, type ActividadInput } from "@/lib/validators/actividad";
import type { ActividadFila } from "@/lib/datos/calendario";
import { guardarActividad } from "./acciones";

interface Props {
  actividad?: ActividadFila;
  clientes: { id: string; nombre: string }[];
  trabajos: { id: string; cliente_id: string | null; titulo: string }[];
  inicial?: { fecha?: string; cliente?: string; trabajo?: string };
}

export function FormularioActividad({ actividad, clientes, trabajos, inicial }: Props) {
  const router = useRouter();
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<ActividadInput, unknown, ActividadDatos>({
    resolver: zodResolver(actividadSchema),
    defaultValues: {
      cliente_id: actividad?.cliente_id ?? inicial?.cliente ?? "",
      trabajo_id: actividad?.trabajo_id ?? inicial?.trabajo ?? "",
      titulo: actividad?.titulo ?? "",
      descripcion: actividad?.descripcion ?? "",
      tipo: actividad?.tipo ?? "reunion",
      fecha: actividad?.fecha ?? inicial?.fecha ?? hoyLima(),
      hora_inicio: actividad?.hora_inicio ?? "",
      hora_fin: actividad?.hora_fin ?? "",
      lugar: actividad?.lugar ?? "",
      estado: actividad?.estado ?? "planificada",
      visible_empresa: actividad?.visible_empresa ?? true,
      notas: actividad?.notas ?? "",
    },
  });
  const { register, handleSubmit, formState, setError, watch, setValue } = form;
  const errores = formState.errors;
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);
  const clienteId = watch("cliente_id");

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarActividad(datos, actividad?.id);
      if (!r.ok) {
        if (r.campo) setError(r.campo as FieldPath<ActividadInput>, { message: r.error });
        setErrorGeneral(r.error);
        return;
      }
      toast.success(actividad ? "Actividad actualizada." : "Actividad agendada.");
      form.reset(datos as ActividadInput, { keepValues: true });
      if (panel) panel.cerrar(true);
      else router.push(`/panel/calendario?mes=${datos.fecha.slice(0, 7)}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Campo id="titulo" etiqueta="Título" requerido error={errores.titulo?.message} className="sm:col-span-2 lg:col-span-3">
            <Input {...register("titulo")} {...propsCampo("titulo", errores.titulo?.message)} placeholder="Reunión de avance con SGC" autoFocus />
          </Campo>
          <Campo id="tipo" etiqueta="Tipo">
            <Select {...register("tipo")} {...propsCampo("tipo")}>
              {TIPOS_ACTIVIDAD.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="fecha" etiqueta="Fecha" requerido error={errores.fecha?.message}>
            <Input {...register("fecha")} {...propsCampo("fecha", errores.fecha?.message)} type="date" className="font-mono" />
          </Campo>
          <Campo id="hora_inicio" etiqueta="Desde" error={errores.hora_inicio?.message} ayuda="Opcional">
            <Input {...register("hora_inicio")} {...propsCampo("hora_inicio", errores.hora_inicio?.message, "si")} type="time" className="font-mono" />
          </Campo>
          <Campo id="hora_fin" etiqueta="Hasta" error={errores.hora_fin?.message}>
            <Input {...register("hora_fin")} {...propsCampo("hora_fin", errores.hora_fin?.message)} type="time" className="font-mono" />
          </Campo>
          <Campo id="estado" etiqueta="Estado">
            <Select {...register("estado")} {...propsCampo("estado")}>
              {ESTADOS_ACTIVIDAD.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="cliente_id" etiqueta="Empresa" ayuda="Vacío = actividad tuya" className="sm:col-span-2">
            <Select
              {...register("cliente_id", { onChange: () => setValue("trabajo_id", "", { shouldDirty: true }) })}
              {...propsCampo("cliente_id", undefined, "si")}
            >
              <option value="">Solo para mí</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="trabajo_id" etiqueta="Trabajo" ayuda="Opcional" className="sm:col-span-2">
            <Select {...register("trabajo_id")} {...propsCampo("trabajo_id", undefined, "si")} disabled={!clienteId}>
              <option value="">Sin trabajo</option>
              {trabajos
                .filter((t) => t.cliente_id === clienteId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
            </Select>
          </Campo>
          <Campo id="lugar" etiqueta="Lugar o enlace" className="sm:col-span-2 lg:col-span-4">
            <Input {...register("lugar")} {...propsCampo("lugar")} placeholder="Oficina de SGC · o enlace de Meet" />
          </Campo>
          <Campo id="descripcion" etiqueta="Descripción" ayuda="La ve la empresa si la actividad es visible." className="sm:col-span-2">
            <Textarea {...register("descripcion")} {...propsCampo("descripcion", undefined, "si")} rows={3} />
          </Campo>
          <Campo id="notas" etiqueta="Notas internas" ayuda="Solo las ves tú." className="sm:col-span-2">
            <Textarea {...register("notas")} {...propsCampo("notas", undefined, "si")} rows={3} />
          </Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
            <input type="checkbox" {...register("visible_empresa")} disabled={!clienteId} className="size-4 accent-mint-ink dark:accent-mint" />
            Visible en el calendario de la empresa
            {!clienteId ? <span className="text-xs text-muted-foreground">(elige una empresa)</span> : null}
          </label>
        </CardContent>
      </Card>

      <BarraAcciones guardando={guardando} textoGuardar={actividad ? "Guardar cambios" : "Agendar"} hrefCancelar="/panel/calendario" error={errorGeneral} />
    </form>
  );
}
