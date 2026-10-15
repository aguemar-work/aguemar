"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { hoyLima } from "@/lib/format";
import { actaSchema, type ActaDatos, type ActaInput } from "@/lib/validators/brief-acta";
import type { ActaFila } from "@/lib/datos/briefs-actas";
import type { EntregableActa } from "@/lib/documentos";
import type { Area } from "@/types/database";
import { guardarActa } from "./acciones";

interface Props {
  acta?: ActaFila;
  clientes: { id: string; nombre: string }[];
  trabajos: { id: string; cliente_id: string | null; titulo: string }[];
  inicial?: { cliente?: string | null; trabajo?: string; area?: Area; titulo?: string; entregables?: EntregableActa[] };
}

export function FormularioActa({ acta, clientes, trabajos, inicial }: Props) {
  const router = useRouter();
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const entregablesIniciales = acta?.entregables ?? inicial?.entregables ?? [];

  const form = useForm<ActaInput, unknown, ActaDatos>({
    resolver: zodResolver(actaSchema),
    defaultValues: {
      cliente_id: acta?.cliente_id ?? inicial?.cliente ?? "",
      trabajo_id: acta?.trabajo_id ?? inicial?.trabajo ?? "",
      area: acta?.area ?? inicial?.area ?? "desarrollo",
      fecha: acta?.fecha ?? hoyLima(),
      titulo: acta?.titulo ?? (inicial?.titulo ? `Entrega: ${inicial.titulo}` : ""),
      resumen: acta?.resumen ?? "",
      observaciones: acta?.observaciones ?? "",
      notas: acta?.notas ?? "",
      entregables: entregablesIniciales.length
        ? entregablesIniciales.map((e) => ({ nombre: e.nombre, detalle: e.detalle ?? "", url: e.url ?? "" }))
        : [{ nombre: "", detalle: "", url: "" }],
    },
  });
  const { register, handleSubmit, formState, setError, watch, setValue, control } = form;
  const errores = formState.errors;
  const entregables = useFieldArray({ control, name: "entregables" });
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);
  const clienteId = watch("cliente_id");

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarActa(datos, acta?.id);
      if (!r.ok) {
        if (r.campo) setError(r.campo as FieldPath<ActaInput>, { message: r.error });
        setErrorGeneral(r.error);
        return;
      }
      toast.success(acta ? "Acta actualizada." : "Acta guardada como borrador.");
      form.reset(datos as ActaInput, { keepValues: true });
      if (panel && acta) panel.cerrar(true);
      else if (panel) router.replace(`/panel/actas/${r.data.id}`);
      else router.push(`/panel/actas/${r.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entrega</CardTitle>
          <CardDescription>Qué trabajo se entrega y a quién. Cuando la empresa acepte el acta, el trabajo pasa a entregado.</CardDescription>
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
          <Campo id="trabajo_id" etiqueta="Trabajo">
            <Select {...register("trabajo_id")} {...propsCampo("trabajo_id")} disabled={!clienteId}>
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
          <Campo id="area" etiqueta="Área">
            <Select {...register("area")} {...propsCampo("area")}>
              {AREAS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="titulo" etiqueta="Título" requerido error={errores.titulo?.message} className="sm:col-span-3">
            <Input {...register("titulo")} {...propsCampo("titulo", errores.titulo?.message)} placeholder="Entrega de la web corporativa" />
          </Campo>
          <Campo id="fecha" etiqueta="Fecha">
            <Input {...register("fecha")} {...propsCampo("fecha")} type="date" className="font-mono" />
          </Campo>
          <Campo id="resumen" etiqueta="Resumen" ayuda="En una o dos líneas, qué se entrega." className="sm:col-span-2 lg:col-span-4">
            <Textarea {...register("resumen")} {...propsCampo("resumen", undefined, "si")} rows={2} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Entregables</CardTitle>
            <CardDescription>Si viene de un trabajo, se copian sus entregables. Ajusta lo que haga falta.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => entregables.append({ nombre: "", detalle: "", url: "" })}>
            <Plus /> Entregable
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {errores.entregables?.message ? <p className="text-sm text-danger">{errores.entregables.message}</p> : null}
          {entregables.fields.map((f, i) => {
            const e = errores.entregables?.[i];
            return (
              <div key={f.id} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input {...register(`entregables.${i}.nombre`)} aria-label={`Entregable ${i + 1}`} aria-invalid={Boolean(e?.nombre)} placeholder="Web publicada en aguemar.com" />
                <Input {...register(`entregables.${i}.url`)} aria-label={`Enlace del entregable ${i + 1}`} aria-invalid={Boolean(e?.url)} placeholder="https:// (opcional)" className="font-mono text-xs" />
                <Button type="button" variant="ghost" size="icon" aria-label={`Quitar entregable ${i + 1}`} onClick={() => entregables.remove(i)} disabled={entregables.fields.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
                <Input {...register(`entregables.${i}.detalle`)} aria-label={`Detalle del entregable ${i + 1}`} placeholder="Detalle (opcional)" className="sm:col-span-3" />
                {e?.nombre?.message || e?.url?.message ? <p className="text-xs text-danger sm:col-span-3">{e?.nombre?.message ?? e?.url?.message}</p> : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
          <Campo id="observaciones" etiqueta="Observaciones" ayuda="Garantía, pendientes acordados, accesos entregados…">
            <Textarea {...register("observaciones")} {...propsCampo("observaciones", undefined, "si")} rows={3} />
          </Campo>
          <Campo id="notas" etiqueta="Notas internas" ayuda="Solo las ves tú.">
            <Textarea {...register("notas")} {...propsCampo("notas", undefined, "si")} rows={3} />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones guardando={guardando} textoGuardar={acta ? "Guardar cambios" : "Guardar borrador"} hrefCancelar={acta ? `/panel/actas/${acta.id}` : "/panel/documentos"} error={errorGeneral} />
    </form>
  );
}
