"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ListRestart, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { BarraAcciones } from "@/components/formulario/barra-acciones";
import { useAvisoCambios } from "@/components/formulario/use-aviso-cambios";
import { usePanelLateral } from "@/components/panel/panel-lateral";
import { ESTADOS_DIAGNOSTICO, ESTADOS_FINALES, ESTADOS_INCIDENCIA, MODALIDADES, nombreEquipo, proximoMantenimientoSugerido } from "@/lib/documentos";
import { hoyLima } from "@/lib/format";
import { EQUIPO_NUEVO, fichaSchema, type FichaDatos, type FichaInput } from "@/lib/validators/ficha";
import type { PlantillaChecklistRow } from "@/types/database";
import type { FichaEdicion } from "@/lib/datos/fichas";
import { guardarFicha } from "./acciones";
import { ImportarDiagnostico } from "./importar-diagnostico";

interface Props {
  ficha?: FichaEdicion;
  clientes: { id: string; nombre: string }[];
  equipos: { id: string; cliente_id: string; marca: string | null; modelo: string | null; serie: string }[];
  trabajos: { id: string; cliente_id: string | null; titulo: string }[];
  plantillas: PlantillaChecklistRow[];
  inicial?: { cliente?: string; equipo?: string; trabajo?: string };
}

const CAMPOS_EQUIPO: [keyof FichaInput["equipo_datos"], string][] = [
  ["marca", "Marca"],
  ["modelo", "Modelo"],
  ["serie", "Serie"],
  ["sistema_operativo", "Sistema operativo"],
  ["procesador", "Procesador"],
  ["ram", "Memoria RAM"],
  ["almacenamiento", "Almacenamiento"],
  ["grafica", "Gráfica"],
  ["bateria", "Batería"],
  ["bios", "BIOS"],
];

const equipoVacio: FichaInput["equipo_datos"] = {
  marca: "",
  modelo: "",
  serie: "",
  sistema_operativo: "",
  procesador: "",
  ram: "",
  almacenamiento: "",
  grafica: "",
  bateria: "",
  bios: "",
};

function trabajosDePlantilla(plantillas: PlantillaChecklistRow[], tipo: string) {
  const p = plantillas.find((x) => x.tipo_servicio.toLowerCase() === tipo.trim().toLowerCase());
  return (p?.items ?? []).map((i) => ({ titulo: i.titulo, detalle: i.detalle ?? "", hecho: true }));
}

export function FormularioFicha({ ficha, clientes, equipos, trabajos, plantillas, inicial }: Props) {
  const router = useRouter();
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const hoy = hoyLima();
  const tipoInicial = ficha?.tipo_servicio ?? plantillas[0]?.tipo_servicio ?? "Mantenimiento preventivo";

  const form = useForm<FichaInput, unknown, FichaDatos>({
    resolver: zodResolver(fichaSchema),
    defaultValues: {
      cliente_id: ficha?.cliente_id ?? inicial?.cliente ?? "",
      equipo_id: ficha?.equipo_id ?? inicial?.equipo ?? "",
      equipo_datos: equipoVacio,
      actualizar_equipo: false,
      trabajo_id: ficha?.trabajo_id ?? inicial?.trabajo ?? "",
      fecha: ficha?.fecha ?? hoy,
      tipo_servicio: tipoInicial,
      modalidad: ficha?.modalidad ?? "remota",
      titular: ficha?.titular ?? "",
      resumen: ficha?.resumen ?? "",
      estado_final: ficha?.estado_final ?? "operativo",
      indicadores: ficha?.indicadores ?? [],
      diagnosticos: ficha?.ficha_diagnosticos.map((d) => ({ elemento: d.elemento, resultado: d.resultado, estado: d.estado })) ?? [],
      trabajos: ficha ? ficha.ficha_trabajos.map((t) => ({ titulo: t.titulo, detalle: t.detalle ?? "", hecho: t.hecho })) : trabajosDePlantilla(plantillas, tipoInicial),
      incidencias: ficha?.ficha_incidencias.map((x) => ({ titulo: x.titulo, causa: x.causa ?? "", solucion: x.solucion ?? "", estado: x.estado })) ?? [],
      recomendaciones: ficha?.ficha_recomendaciones.map((r) => ({ texto: r.texto })) ?? [],
      proximo_mantenimiento: ficha ? (ficha.proximo_mantenimiento ?? "") : proximoMantenimientoSugerido(hoy),
    },
  });
  const { register, handleSubmit, formState, setError, watch, control, setValue, getValues } = form;
  const errores = formState.errors;
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);

  const indicadores = useFieldArray({ control, name: "indicadores" });
  const diagnosticos = useFieldArray({ control, name: "diagnosticos" });
  const trabajosRealizados = useFieldArray({ control, name: "trabajos" });
  const incidencias = useFieldArray({ control, name: "incidencias" });
  const recomendaciones = useFieldArray({ control, name: "recomendaciones" });

  const clienteId = watch("cliente_id");
  const equipoId = watch("equipo_id");
  const actualizarEquipo = watch("actualizar_equipo");
  const tipoServicio = watch("tipo_servicio");
  const equiposEmpresa = equipos.filter((e) => e.cliente_id === clienteId);
  const trabajosEmpresa = trabajos.filter((t) => t.cliente_id === clienteId);
  const mostrarEquipo = equipoId === EQUIPO_NUEVO || actualizarEquipo;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarFicha(datos, ficha?.id);
      if (!r.ok) {
        if (r.campo) setError(r.campo as FieldPath<FichaInput>, { message: r.error });
        setErrorGeneral(r.error);
        return;
      }
      toast.success(ficha ? "Ficha actualizada." : "Ficha guardada como borrador.");
      form.reset(datos as FichaInput, { keepValues: true });
      if (panel && ficha) panel.cerrar(true);
      else if (panel) router.replace(`/panel/fichas/${r.data.id}`);
      else router.push(`/panel/fichas/${r.data.id}`);
    }),
  );

  const opts = { shouldDirty: true } as const;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Servicio</CardTitle>
            <CardDescription>Empresa, equipo y tipo de servicio. Importa el diagnóstico para llenar el equipo y el diagnóstico inicial.</CardDescription>
          </div>
          <ImportarDiagnostico
            deshabilitado={!clienteId}
            onAplicar={(i, crudo, o) => {
              if (o.equipo) {
                const existente = i.equipo.serie ? equiposEmpresa.find((e) => e.serie.toLowerCase() === i.equipo.serie!.toLowerCase()) : undefined;
                setValue("equipo_id", existente ? existente.id : EQUIPO_NUEVO, opts);
                setValue("actualizar_equipo", Boolean(existente), opts);
                setValue("equipo_datos", Object.fromEntries(CAMPOS_EQUIPO.map(([k]) => [k, i.equipo[k] ?? ""])) as FichaInput["equipo_datos"], opts);
              }
              if (o.diagnostico) setValue("diagnosticos", i.diagnosticos, opts);
              if (o.indicadores) setValue("indicadores", i.indicadores, opts);
              setValue("diagnostico_origen", crudo, opts);
              if (!getValues("titular")) {
                const modalidad = getValues("modalidad") === "remota" ? "remoto" : "presencial";
                setValue("titular", `${getValues("tipo_servicio")} ${modalidad} · ${[i.equipo.marca, i.equipo.modelo].filter(Boolean).join(" ")}`.trim(), opts);
              }
              toast.success("Diagnóstico aplicado. Revísalo antes de guardar.");
            }}
          />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="cliente_id" etiqueta="Empresa" requerido error={errores.cliente_id?.message}>
            <Select
              {...register("cliente_id", {
                onChange: () => {
                  setValue("equipo_id", "", opts);
                  setValue("trabajo_id", "", opts);
                  setValue("actualizar_equipo", false, opts);
                },
              })}
              {...propsCampo("cliente_id", errores.cliente_id?.message)}
            >
              <option value="">Elige la empresa</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="equipo_id" etiqueta="Equipo" error={errores.equipo_id?.message}>
            <Select {...register("equipo_id", { onChange: () => setValue("actualizar_equipo", false, opts) })} {...propsCampo("equipo_id", errores.equipo_id?.message)} disabled={!clienteId}>
              <option value="">Sin equipo</option>
              {equiposEmpresa.map((e) => (
                <option key={e.id} value={e.id}>
                  {nombreEquipo(e)}
                </option>
              ))}
              <option value={EQUIPO_NUEVO}>+ Nuevo equipo</option>
            </Select>
          </Campo>
          <Campo id="trabajo_id" etiqueta="Trabajo vinculado" ayuda="Opcional">
            <Select {...register("trabajo_id")} {...propsCampo("trabajo_id", undefined, "si")} disabled={!clienteId}>
              <option value="">Sin trabajo</option>
              {trabajosEmpresa.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
            </Select>
          </Campo>

          {mostrarEquipo ? (
            <div className="rounded-md border border-dashed border-border p-3 sm:col-span-2 lg:col-span-3">
              <p className="mb-3 text-sm font-medium">
                {equipoId === EQUIPO_NUEVO ? "Equipo nuevo" : "Se actualizarán los datos del equipo con el diagnóstico"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAMPOS_EQUIPO.map(([k, etiqueta]) => {
                  const err = errores.equipo_datos?.[k]?.message;
                  return (
                    <Campo key={k} id={`eq-${k}`} etiqueta={etiqueta} requerido={k === "serie" && equipoId === EQUIPO_NUEVO} error={err}>
                      <Input
                        {...register(`equipo_datos.${k}`)}
                        {...propsCampo(`eq-${k}`, err)}
                        readOnly={k === "serie" && equipoId !== EQUIPO_NUEVO}
                        className={k === "serie" || k === "bios" ? "font-mono" : undefined}
                      />
                    </Campo>
                  );
                })}
              </div>
            </div>
          ) : null}

          <Campo id="tipo_servicio" etiqueta="Tipo de servicio" requerido error={errores.tipo_servicio?.message}>
            <Input {...register("tipo_servicio")} {...propsCampo("tipo_servicio", errores.tipo_servicio?.message)} list="tipos-servicio" />
            <datalist id="tipos-servicio">
              {plantillas.map((p) => (
                <option key={p.id} value={p.tipo_servicio} />
              ))}
            </datalist>
          </Campo>
          <Campo id="modalidad" etiqueta="Modalidad">
            <Select {...register("modalidad")} {...propsCampo("modalidad")}>
              {MODALIDADES.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="fecha" etiqueta="Fecha del servicio" error={errores.fecha?.message}>
            <Input
              {...register("fecha", {
                onChange: (e) => {
                  if (!ficha && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setValue("proximo_mantenimiento", proximoMantenimientoSugerido(e.target.value), opts);
                },
              })}
              {...propsCampo("fecha", errores.fecha?.message)}
              type="date"
              className="font-mono"
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portada</CardTitle>
          <CardDescription>Titular, resumen para el cliente, estado final y hasta 4 indicadores clave.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Campo id="titular" etiqueta="Titular" requerido error={errores.titular?.message} className="sm:col-span-2">
            <Input {...register("titular")} {...propsCampo("titular", errores.titular?.message)} placeholder="Mantenimiento preventivo remoto · Lenovo 83LT" />
          </Campo>
          <Campo id="estado_final" etiqueta="Estado final">
            <Select {...register("estado_final")} {...propsCampo("estado_final")}>
              {ESTADOS_FINALES.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="resumen" etiqueta="Resumen" error={errores.resumen?.message} className="sm:col-span-3">
            <Textarea {...register("resumen")} {...propsCampo("resumen", errores.resumen?.message)} rows={3} placeholder="En dos líneas: cómo quedó el equipo y qué se atendió." />
          </Campo>
          <div className="space-y-2 sm:col-span-3">
            <p className="text-sm font-medium">Indicadores</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {indicadores.fields.map((f, i) => (
                <div key={f.id} className="flex gap-2">
                  <Input {...register(`indicadores.${i}.valor`)} aria-label={`Valor del indicador ${i + 1}`} placeholder="0 %" className="w-24 font-mono" />
                  <Input {...register(`indicadores.${i}.etiqueta`)} aria-label={`Etiqueta del indicador ${i + 1}`} placeholder="desgaste del SSD" />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Quitar indicador ${i + 1}`} onClick={() => indicadores.remove(i)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            {errores.indicadores?.message ? <p className="text-xs text-danger">{errores.indicadores.message}</p> : null}
            {indicadores.fields.length < 4 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => indicadores.append({ valor: "", etiqueta: "" })}>
                <Plus /> Indicador
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Diagnóstico inicial</CardTitle>
            <CardDescription>Cómo encontraste el equipo.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => diagnosticos.append({ elemento: "", resultado: "", estado: "optimo" })}>
            <Plus /> Fila
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {diagnosticos.fields.length === 0 ? <Vacio texto="Importa el diagnóstico o agrega filas a mano." /> : null}
          {diagnosticos.fields.map((f, i) => (
            <div key={f.id} className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr_9rem_auto]">
              <Input {...register(`diagnosticos.${i}.elemento`)} aria-label={`Elemento ${i + 1}`} placeholder="Batería" />
              <Input {...register(`diagnosticos.${i}.resultado`)} aria-label={`Resultado ${i + 1}`} placeholder="99,7 % de la capacidad de diseño" />
              <Select {...register(`diagnosticos.${i}.estado`)} aria-label={`Estado ${i + 1}`}>
                {ESTADOS_DIAGNOSTICO.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.etiqueta}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar fila ${i + 1}`} onClick={() => diagnosticos.remove(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Trabajos realizados</CardTitle>
            <CardDescription>Checklist del tipo de servicio; marca lo hecho y ajusta el detalle.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const items = trabajosDePlantilla(plantillas, tipoServicio ?? "");
                if (!items.length) return void toast.error(`No hay plantilla para "${tipoServicio}". Créala en Mi marca.`);
                if (trabajosRealizados.fields.length && !window.confirm("¿Reemplazar los trabajos actuales por la plantilla?")) return;
                setValue("trabajos", items, opts);
              }}
            >
              <ListRestart /> Cargar plantilla
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => trabajosRealizados.append({ titulo: "", detalle: "", hecho: true })}>
              <Plus /> Trabajo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {trabajosRealizados.fields.length === 0 ? <Vacio texto="Sin trabajos. Carga la plantilla del tipo de servicio." /> : null}
          {trabajosRealizados.fields.map((f, i) => (
            <div key={f.id} className="grid items-start gap-2 sm:grid-cols-[auto_minmax(0,12rem)_1fr_auto]">
              <input type="checkbox" {...register(`trabajos.${i}.hecho`)} className="mt-3 size-4 accent-mint-ink dark:accent-mint" aria-label={`Hecho ${i + 1}`} />
              <Input {...register(`trabajos.${i}.titulo`)} aria-label={`Trabajo ${i + 1}`} placeholder="Respaldo" />
              <Input {...register(`trabajos.${i}.detalle`)} aria-label={`Detalle del trabajo ${i + 1}`} placeholder="Qué se hizo" />
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar trabajo ${i + 1}`} onClick={() => trabajosRealizados.remove(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Incidencias atendidas</CardTitle>
            <CardDescription>Lo que reportó el cliente: causa y solución.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => incidencias.append({ titulo: "", causa: "", solucion: "", estado: "resuelta" })}>
            <Plus /> Incidencia
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {incidencias.fields.length === 0 ? <Vacio texto="Sin incidencias reportadas." /> : null}
          {incidencias.fields.map((f, i) => (
            <div key={f.id} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_10rem_auto]">
              <Input {...register(`incidencias.${i}.titulo`)} aria-label={`Incidencia ${i + 1}`} placeholder="Error 0x80073D02 al actualizar WhatsApp" />
              <Select {...register(`incidencias.${i}.estado`)} aria-label={`Estado de la incidencia ${i + 1}`}>
                {ESTADOS_INCIDENCIA.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.etiqueta}
                  </option>
                ))}
              </Select>
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar incidencia ${i + 1}`} onClick={() => incidencias.remove(i)}>
                <Trash2 className="size-4" />
              </Button>
              <Textarea {...register(`incidencias.${i}.causa`)} aria-label={`Causa ${i + 1}`} placeholder="Causa" rows={2} className="sm:col-span-3" />
              <Textarea {...register(`incidencias.${i}.solucion`)} aria-label={`Solución ${i + 1}`} placeholder="Solución" rows={2} className="sm:col-span-3" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Recomendaciones y próximo mantenimiento</CardTitle>
            <CardDescription>Consejos para el cliente y cuándo volver (por defecto, 6 meses).</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => recomendaciones.append({ texto: "" })}>
            <Plus /> Recomendación
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recomendaciones.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <span className="mt-2.5 w-6 shrink-0 font-mono text-xs text-mint-ink dark:text-mint">{String(i + 1).padStart(2, "0")}</span>
              <Input {...register(`recomendaciones.${i}.texto`)} aria-label={`Recomendación ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" aria-label={`Quitar recomendación ${i + 1}`} onClick={() => recomendaciones.remove(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Campo id="proximo_mantenimiento" etiqueta="Próximo mantenimiento" error={errores.proximo_mantenimiento?.message} className="max-w-xs pt-2">
            <Input {...register("proximo_mantenimiento")} {...propsCampo("proximo_mantenimiento", errores.proximo_mantenimiento?.message)} type="date" className="font-mono" />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones
        guardando={guardando}
        textoGuardar={ficha ? "Guardar cambios" : "Guardar borrador"}
        hrefCancelar={ficha ? `/panel/fichas/${ficha.id}` : "/panel/fichas"}
        error={errorGeneral}
      />
    </form>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{texto}</p>;
}
