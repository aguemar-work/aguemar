"use client";

import { useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
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
import { AREAS } from "@/lib/areas";
import { hoyLima } from "@/lib/format";
import { abrirCreado } from "@/lib/navegacion";
import { briefSchema, type BriefDatos, type BriefInput } from "@/lib/validators/brief-acta";
import type { BriefFila } from "@/lib/datos/briefs-actas";
import type { Area } from "@/types/database";
import { guardarBrief } from "./acciones";

interface Props {
  brief?: BriefFila;
  clientes: { id: string; nombre: string }[];
  trabajos: { id: string; cliente_id: string | null; titulo: string }[];
  inicial?: { cliente?: string | null; trabajo?: string; area?: Area; titulo?: string; objetivo?: string | null };
}

const SECCIONES: { campo: keyof BriefInput; etiqueta: string; ayuda: string; filas: number; ejemplo: string }[] = [
  { campo: "objetivo", etiqueta: "Objetivo", ayuda: "Qué se quiere lograr y cómo sabremos que funcionó.", filas: 3, ejemplo: "Renovar la web para recibir más consultas por WhatsApp." },
  { campo: "contexto", etiqueta: "Contexto", ayuda: "La empresa, la situación actual, lo que ya existe.", filas: 3, ejemplo: "Hoy tienen una web de 2019 que no se ve bien en celular." },
  { campo: "publico", etiqueta: "Público", ayuda: "A quién va dirigido.", filas: 2, ejemplo: "Empresas de Lima que buscan servicios de construcción." },
  { campo: "alcance", etiqueta: "Alcance", ayuda: "Una línea por punto: lo que sí incluye.", filas: 4, ejemplo: "Diseño de 5 secciones\nVersión para celular\nFormulario de contacto" },
  { campo: "fuera_alcance", etiqueta: "Fuera del alcance", ayuda: "Una línea por punto: lo que no incluye, para evitar malentendidos.", filas: 3, ejemplo: "Redacción de textos\nFotografía" },
  { campo: "entregables", etiqueta: "Entregables", ayuda: "Una línea por entregable.", filas: 3, ejemplo: "Web publicada en su dominio\nManual de uso del panel" },
  { campo: "referencias", etiqueta: "Referencias", ayuda: "Una línea por referencia: marcas, webs o enlaces que les gustan.", filas: 3, ejemplo: "https://ejemplo.com — por la claridad del menú" },
];

export function FormularioBrief({ brief, clientes, trabajos, inicial }: Props) {
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<BriefInput, unknown, BriefDatos>({
    resolver: zodResolver(briefSchema),
    defaultValues: {
      cliente_id: brief?.cliente_id ?? inicial?.cliente ?? "",
      trabajo_id: brief?.trabajo_id ?? inicial?.trabajo ?? "",
      area: brief?.area ?? inicial?.area ?? "diseno",
      fecha: brief?.fecha ?? hoyLima(),
      titulo: brief?.titulo ?? inicial?.titulo ?? "",
      objetivo: brief?.objetivo ?? inicial?.objetivo ?? "",
      contexto: brief?.contexto ?? "",
      publico: brief?.publico ?? "",
      alcance: brief?.alcance ?? "",
      fuera_alcance: brief?.fuera_alcance ?? "",
      entregables: brief?.entregables ?? "",
      referencias: brief?.referencias ?? "",
      fecha_entrega: brief?.fecha_entrega ?? "",
      notas: brief?.notas ?? "",
    },
  });
  const { register, handleSubmit, formState, setError, watch, setValue } = form;
  const errores = formState.errors;
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);
  const clienteId = watch("cliente_id");

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarBrief(datos, brief?.id);
      if (!r.ok) {
        if (r.campo) setError(r.campo as FieldPath<BriefInput>, { message: r.error });
        setErrorGeneral(r.error);
        return;
      }
      toast.success(brief ? "Brief actualizado." : "Brief guardado como borrador.");
      form.reset(datos as BriefInput, { keepValues: true });
      if (panel && brief) panel.cerrar(true);
      else abrirCreado(`/panel/briefs/${r.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Proyecto</CardTitle>
          <CardDescription>Para quién es y de qué trata. Si viene de un trabajo, quedan vinculados.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo id="cliente_id" etiqueta="Empresa" requerido error={errores.cliente_id?.message} className="sm:col-span-2">
            <Select {...register("cliente_id", { onChange: () => setValue("trabajo_id", "", { shouldDirty: true }) })} {...propsCampo("cliente_id", errores.cliente_id?.message)}>
              <option value="">Elige la empresa</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="area" etiqueta="Área">
            <Select {...register("area")} {...propsCampo("area")}>
              {AREAS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="trabajo_id" etiqueta="Trabajo" ayuda="Opcional">
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
          <Campo id="titulo" etiqueta="Título" requerido error={errores.titulo?.message} className="sm:col-span-2">
            <Input {...register("titulo")} {...propsCampo("titulo", errores.titulo?.message)} placeholder="Rediseño de la web corporativa" />
          </Campo>
          <Campo id="fecha" etiqueta="Fecha">
            <Input {...register("fecha")} {...propsCampo("fecha")} type="date" className="font-mono" />
          </Campo>
          <Campo id="fecha_entrega" etiqueta="Entrega estimada" error={errores.fecha_entrega?.message}>
            <Input {...register("fecha_entrega")} {...propsCampo("fecha_entrega", errores.fecha_entrega?.message)} type="date" className="font-mono" />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
          <CardDescription>Lo que no llenes no aparece en el documento.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {SECCIONES.map((s) => (
            <Campo key={s.campo} id={s.campo} etiqueta={s.etiqueta} ayuda={s.ayuda} error={errores[s.campo]?.message as string | undefined}>
              <Textarea {...register(s.campo)} {...propsCampo(s.campo, errores[s.campo]?.message as string | undefined, "si")} rows={s.filas} placeholder={s.ejemplo} />
            </Campo>
          ))}
          <Campo id="notas" etiqueta="Notas internas" ayuda="Solo las ves tú." className="md:col-span-2">
            <Textarea {...register("notas")} {...propsCampo("notas", undefined, "si")} rows={2} />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones guardando={guardando} textoGuardar={brief ? "Guardar cambios" : "Guardar borrador"} hrefCancelar={brief ? `/panel/briefs/${brief.id}` : "/panel/documentos"} error={errorGeneral} />
    </form>
  );
}
