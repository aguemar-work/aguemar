"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/panel/empty-state";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { plantillaSchema, type PlantillaDatos, type PlantillaInput } from "@/lib/validators/plantilla";
import type { PlantillaChecklistRow } from "@/types/database";
import { eliminarPlantilla, guardarPlantilla } from "./acciones";

interface Props {
  plantillas: PlantillaChecklistRow[];
}

export function EditorPlantillas({ plantillas }: Props) {
  const [creando, setCreando] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Plantillas de checklist</h2>
          <p className="text-sm text-muted-foreground">Los trabajos realizados de cada ficha se precargan según el tipo de servicio. Puedes editarlos en cada ficha.</p>
        </div>
        <Button variant="outline" onClick={() => setCreando(true)} disabled={creando}>
          <Plus /> Nueva plantilla
        </Button>
      </div>

      {creando ? <TarjetaPlantilla onListo={() => setCreando(false)} abiertaInicial /> : null}

      {plantillas.length === 0 && !creando ? (
        <EmptyState icono={ListChecks} titulo="Aún no hay plantillas." descripcion="Crea una por tipo de servicio, por ejemplo Mantenimiento preventivo." className="py-8" />
      ) : (
        plantillas.map((p) => <TarjetaPlantilla key={p.id} plantilla={p} />)
      )}
    </div>
  );
}

function TarjetaPlantilla({ plantilla, onListo, abiertaInicial }: { plantilla?: PlantillaChecklistRow; onListo?: () => void; abiertaInicial?: boolean }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState(abiertaInicial ?? false);
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<PlantillaInput, unknown, PlantillaDatos>({
    resolver: zodResolver(plantillaSchema),
    defaultValues: {
      tipo_servicio: plantilla?.tipo_servicio ?? "",
      items: plantilla?.items?.length ? plantilla.items.map((i) => ({ titulo: i.titulo, detalle: i.detalle ?? "" })) : [{ titulo: "", detalle: "" }],
    },
  });
  const { register, control, handleSubmit, formState, setError, reset } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: "items" });
  const errores = formState.errors;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarPlantilla(datos, plantilla?.id);
      if (!r.ok) {
        if (r.campo === "tipo_servicio") setError("tipo_servicio", { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success(plantilla ? "Plantilla guardada." : "Plantilla creada.");
      reset(datos as PlantillaInput, { keepValues: true });
      onListo?.();
      router.refresh();
    }),
  );

  const titulo = plantilla?.tipo_servicio ?? "Nueva plantilla";

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>
            {plantilla ? `${plantilla.items.length} pasos` : "Define el tipo de servicio y sus pasos."}
            {formState.isDirty ? " · cambios sin guardar" : ""}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-1">
          {plantilla ? (
            <ConfirmarEliminar
              titulo={`¿Eliminar la plantilla "${plantilla.tipo_servicio}"?`}
              descripcion="Las fichas ya creadas no cambian. Solo dejará de precargarse en fichas nuevas."
              accion={eliminarPlantilla.bind(null, plantilla.id)}
              textoExito="Plantilla eliminada."
              variant="ghost"
              size="icon"
            >
              <Trash2 />
            </ConfirmarEliminar>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}>
            {abierta ? "Cerrar" : "Editar"}
          </Button>
        </div>
      </CardHeader>
      {abierta ? (
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Campo id={`p-tipo-${plantilla?.id ?? "nueva"}`} etiqueta="Tipo de servicio" requerido error={errores.tipo_servicio?.message}>
              <Input {...register("tipo_servicio")} {...propsCampo(`p-tipo-${plantilla?.id ?? "nueva"}`, errores.tipo_servicio?.message)} placeholder="Mantenimiento preventivo" />
            </Campo>

            <ol className="space-y-2">
              {fields.map((f, i) => (
                <li key={f.id} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[auto_1fr_1.5fr_auto] sm:items-start">
                  <span className="pt-2 font-mono text-xs text-mint-ink dark:text-mint">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <Input {...register(`items.${i}.titulo`)} placeholder="Título del paso" aria-label={`Título del paso ${i + 1}`} aria-invalid={errores.items?.[i]?.titulo ? true : undefined} />
                    {errores.items?.[i]?.titulo ? <p className="mt-1 text-xs text-danger">{errores.items[i]?.titulo?.message}</p> : null}
                  </div>
                  <Input {...register(`items.${i}.detalle`)} placeholder="Detalle (opcional)" aria-label={`Detalle del paso ${i + 1}`} />
                  <div className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Subir" disabled={i === 0} onClick={() => move(i, i - 1)}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Bajar" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-8" aria-label="Quitar paso" disabled={fields.length === 1} onClick={() => remove(i)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            {errores.items?.root?.message || (typeof errores.items?.message === "string" ? errores.items.message : null) ? (
              <p role="alert" className="text-sm text-danger">
                {errores.items?.root?.message ?? errores.items?.message}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => append({ titulo: "", detalle: "" })}>
                <Plus /> Agregar paso
              </Button>
              <div className="flex items-center gap-3">
                {errorGeneral ? (
                  <p role="alert" className="text-sm text-danger">
                    {errorGeneral}
                  </p>
                ) : null}
                {onListo ? (
                  <Button type="button" variant="ghost" onClick={onListo} disabled={guardando}>
                    Cancelar
                  </Button>
                ) : null}
                <Button type="submit" variant="mint" disabled={guardando}>
                  {guardando ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  {plantilla ? "Guardar plantilla" : "Crear plantilla"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
