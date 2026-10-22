"use client";

import { useState, useTransition } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
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
import { MAX_INDICADORES, MAX_SECCIONES, periodoMes, textoPeriodo, tituloSugerido } from "@/lib/informe";
import { abrirCreado } from "@/lib/navegacion";
import { informeSchema, type InformeDatos, type InformeInput } from "@/lib/validators/informe";
import type { InformeFila } from "@/lib/datos/informes";
import type { Area } from "@/types/database";
import { armarInforme, guardarInforme } from "./acciones";

interface Props {
  informe?: InformeFila;
  clientes: { id: string; nombre: string }[];
  trabajos: { id: string; cliente_id: string | null; titulo: string }[];
  inicial?: { cliente?: string | null; trabajo?: string; area?: Area };
}

const SECCIONES_BASE = [
  { titulo: "Trabajo realizado", texto: "" },
  { titulo: "Próximos pasos", texto: "" },
];

export function FormularioInforme({ informe, clientes, trabajos, inicial }: Props) {
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [armando, iniciarArmado] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const hoy = hoyLima();
  // Por defecto, el mes pasado: el informe se hace al cerrar el mes.
  const pasado = periodoMes(hoy, -1);

  const form = useForm<InformeInput, unknown, InformeDatos>({
    resolver: zodResolver(informeSchema),
    defaultValues: {
      cliente_id: informe?.cliente_id ?? inicial?.cliente ?? "",
      trabajo_id: informe?.trabajo_id ?? inicial?.trabajo ?? "",
      area: informe?.area ?? inicial?.area ?? "desarrollo",
      fecha: informe?.fecha ?? hoy,
      titulo: informe?.titulo ?? tituloSugerido(pasado.inicio, pasado.fin),
      periodo_inicio: informe?.periodo_inicio ?? pasado.inicio,
      periodo_fin: informe?.periodo_fin ?? pasado.fin,
      resumen: informe?.resumen ?? "",
      indicadores: (informe?.indicadores ?? []).map((i) => ({ valor: i.valor, etiqueta: i.etiqueta, nota: i.nota ?? "" })),
      secciones: informe?.secciones?.length ? informe.secciones : SECCIONES_BASE,
      notas: informe?.notas ?? "",
    },
  });
  const { register, handleSubmit, formState, setError, watch, setValue, getValues, control } = form;
  const errores = formState.errors;
  const indicadores = useFieldArray({ control, name: "indicadores" });
  const secciones = useFieldArray({ control, name: "secciones" });
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);
  const clienteId = watch("cliente_id");
  const inicio = watch("periodo_inicio");
  const fin = watch("periodo_fin");

  /** Cambia el periodo y, si el título era el sugerido, lo actualiza. */
  const fijarPeriodo = (p: { inicio: string; fin: string }) => {
    const tituloEraSugerido = getValues("titulo") === tituloSugerido(getValues("periodo_inicio"), getValues("periodo_fin"));
    setValue("periodo_inicio", p.inicio, { shouldDirty: true });
    setValue("periodo_fin", p.fin, { shouldDirty: true });
    if (tituloEraSugerido) setValue("titulo", tituloSugerido(p.inicio, p.fin), { shouldDirty: true });
  };

  const armar = () =>
    iniciarArmado(async () => {
      const v = getValues();
      const conTexto = v.secciones.some((s) => s.texto.trim()) || v.indicadores.length > 0 || (v.resumen ?? "").trim();
      if (conTexto && !window.confirm("Se reemplazan el resumen, los indicadores y las secciones por lo hecho en el periodo. ¿Continuar?")) return;
      const r = await armarInforme({ cliente_id: v.cliente_id, desde: v.periodo_inicio, hasta: v.periodo_fin, trabajo_id: v.trabajo_id || null });
      if (!r.ok) return void avisoError(r.error);
      setValue("resumen", r.data.resumen, { shouldDirty: true });
      indicadores.replace(r.data.indicadores.map((i) => ({ valor: i.valor, etiqueta: i.etiqueta, nota: "" })));
      secciones.replace(r.data.secciones);
      if (r.data.vacio) toast.info("No hay tareas, actividades ni fichas registradas en ese periodo. Escribe el contenido a mano.");
      else toast.success("Listo: revisa y ajusta el texto antes de publicar.");
    });

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarInforme(datos, informe?.id);
      if (!r.ok) {
        if (r.campo) setError(r.campo as FieldPath<InformeInput>, { message: r.error });
        setErrorGeneral(r.error);
        return;
      }
      toast.success(informe ? "Informe actualizado." : "Informe guardado como borrador.");
      form.reset(getValues(), { keepValues: true });
      if (panel && informe) panel.cerrar(true);
      else abrirCreado(`/panel/informes/${r.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Empresa y periodo</CardTitle>
          <CardDescription>Elige de qué empresa y qué periodo informas. Con “Armar” se llena con lo que registraste en ese tiempo.</CardDescription>
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
          <Campo id="trabajo_id" etiqueta="Trabajo" ayuda="Opcional: solo ese proyecto.">
            <Select {...register("trabajo_id")} {...propsCampo("trabajo_id", undefined, "si")} disabled={!clienteId}>
              <option value="">Todos</option>
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
          <Campo id="periodo_inicio" etiqueta="Desde" requerido error={errores.periodo_inicio?.message}>
            <Input {...register("periodo_inicio")} {...propsCampo("periodo_inicio", errores.periodo_inicio?.message)} type="date" className="font-mono" />
          </Campo>
          <Campo id="periodo_fin" etiqueta="Hasta" requerido error={errores.periodo_fin?.message}>
            <Input {...register("periodo_fin")} {...propsCampo("periodo_fin", errores.periodo_fin?.message)} type="date" className="font-mono" />
          </Campo>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fijarPeriodo(periodoMes(hoy, -1))}>
              Mes pasado
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fijarPeriodo(periodoMes(hoy))}>
              Este mes
            </Button>
            <Button type="button" variant="mint" size="sm" onClick={armar} disabled={armando || !clienteId}>
              {armando ? <Loader2 className="animate-spin" /> : <Sparkles />} Armar con lo del periodo
            </Button>
          </div>
          <Campo id="titulo" etiqueta="Título" requerido error={errores.titulo?.message} className="sm:col-span-2 lg:col-span-3">
            <Input {...register("titulo")} {...propsCampo("titulo", errores.titulo?.message)} />
          </Campo>
          <Campo id="fecha" etiqueta="Fecha de emisión">
            <Input {...register("fecha")} {...propsCampo("fecha")} type="date" className="font-mono" />
          </Campo>
          <Campo id="resumen" etiqueta="Resumen" ayuda={inicio && fin && fin >= inicio ? `Lo más importante de ${textoPeriodo(inicio, fin).toLowerCase()} en dos o tres líneas.` : undefined} className="sm:col-span-2 lg:col-span-4">
            <Textarea {...register("resumen")} {...propsCampo("resumen", undefined, "si")} rows={3} />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Indicadores</CardTitle>
            <CardDescription>Hasta {MAX_INDICADORES} cifras que resumen el periodo: “12 · Tareas completadas”, “98 % · Disponibilidad”.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => indicadores.append({ valor: "", etiqueta: "", nota: "" })} disabled={indicadores.fields.length >= MAX_INDICADORES}>
            <Plus /> Indicador
          </Button>
        </CardHeader>
        <CardContent>
          {indicadores.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin indicadores. Son opcionales.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {indicadores.fields.map((f, i) => {
                const e = errores.indicadores?.[i];
                return (
                  <div key={f.id} className="grid grid-cols-[6rem_1fr_auto] gap-2 rounded-md border border-border p-3">
                    <Input {...register(`indicadores.${i}.valor`)} aria-label={`Valor del indicador ${i + 1}`} aria-invalid={Boolean(e?.valor)} placeholder="12" className="font-mono" />
                    <Input {...register(`indicadores.${i}.etiqueta`)} aria-label={`Qué mide el indicador ${i + 1}`} aria-invalid={Boolean(e?.etiqueta)} placeholder="Tareas completadas" />
                    <Button type="button" variant="ghost" size="icon" aria-label={`Quitar indicador ${i + 1}`} onClick={() => indicadores.remove(i)}>
                      <Trash2 className="size-4" />
                    </Button>
                    <Input {...register(`indicadores.${i}.nota`)} aria-label={`Nota del indicador ${i + 1}`} placeholder="Nota corta (opcional)" className="col-span-3 text-xs" />
                    {e?.valor?.message || e?.etiqueta?.message ? <p className="col-span-3 text-xs text-danger">{e?.valor?.message ?? e?.etiqueta?.message}</p> : null}
                  </div>
                );
              })}
            </div>
          )}
          {errores.indicadores?.message ? <p className="mt-2 text-sm text-danger">{errores.indicadores.message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Contenido</CardTitle>
            <CardDescription>Una sección por tema. Las líneas que empiezan con “-” se muestran como lista. Las secciones vacías no salen.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => secciones.append({ titulo: "", texto: "" })} disabled={secciones.fields.length >= MAX_SECCIONES}>
            <Plus /> Sección
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {secciones.fields.map((f, i) => {
            const e = errores.secciones?.[i];
            return (
              <div key={f.id} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 shrink-0 font-mono text-xs text-mint-ink dark:text-mint">{String(i + 1).padStart(2, "0")}</span>
                  <Input {...register(`secciones.${i}.titulo`)} aria-label={`Título de la sección ${i + 1}`} aria-invalid={Boolean(e?.titulo)} placeholder="Título de la sección" className="font-medium" />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Subir la sección ${i + 1}`} onClick={() => secciones.move(i, i - 1)} disabled={i === 0}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Bajar la sección ${i + 1}`} onClick={() => secciones.move(i, i + 1)} disabled={i === secciones.fields.length - 1}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Quitar la sección ${i + 1}`} onClick={() => secciones.remove(i)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <Textarea {...register(`secciones.${i}.texto`)} aria-label={`Texto de la sección ${i + 1}`} rows={5} />
                {e?.titulo?.message || e?.texto?.message ? <p className="text-xs text-danger">{e?.titulo?.message ?? e?.texto?.message}</p> : null}
              </div>
            );
          })}
          {secciones.fields.length === 0 ? <p className="text-sm text-muted-foreground">Agrega al menos una sección o usa “Armar con lo del periodo”.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Campo id="notas" etiqueta="Notas internas" ayuda="Solo las ves tú; no salen en el informe.">
            <Textarea {...register("notas")} {...propsCampo("notas", undefined, "si")} rows={2} />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones guardando={guardando} textoGuardar={informe ? "Guardar cambios" : "Guardar borrador"} hrefCancelar={informe ? `/panel/informes/${informe.id}` : "/panel/informes"} error={errorGeneral} />
    </form>
  );
}
