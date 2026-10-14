"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { equipoSchema, type EquipoDatos, type EquipoInput } from "@/lib/validators/equipo";
import type { EquipoRow } from "@/types/database";
import { guardarEquipo } from "./acciones";

interface Props {
  equipo?: EquipoRow;
  clientes: { id: string; nombre: string }[];
  clienteInicial?: string;
}

const CAMPOS_SPEC: { nombre: keyof EquipoInput; etiqueta: string; placeholder?: string }[] = [
  { nombre: "sistema_operativo", etiqueta: "Sistema operativo", placeholder: "Windows 11 Pro 10.0.26200" },
  { nombre: "procesador", etiqueta: "Procesador", placeholder: "Intel Core i7-13700H" },
  { nombre: "ram", etiqueta: "Memoria RAM", placeholder: "32 GB" },
  { nombre: "almacenamiento", etiqueta: "Almacenamiento", placeholder: "SSD Samsung 1 TB (MZAL81T0HFLB)" },
  { nombre: "grafica", etiqueta: "Gráfica", placeholder: "NVIDIA RTX 4060" },
  { nombre: "bateria", etiqueta: "Batería", placeholder: "BYD Li-Po 80 000 mWh" },
  { nombre: "bios", etiqueta: "BIOS", placeholder: "RLCN29WW (14/08/2025)" },
];

export function FormularioEquipo({ equipo, clientes, clienteInicial }: Props) {
  const router = useRouter();
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<EquipoInput, unknown, EquipoDatos>({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      cliente_id: equipo?.cliente_id ?? clienteInicial ?? "",
      marca: equipo?.marca ?? "",
      modelo: equipo?.modelo ?? "",
      serie: equipo?.serie ?? "",
      sistema_operativo: equipo?.sistema_operativo ?? "",
      procesador: equipo?.procesador ?? "",
      ram: equipo?.ram ?? "",
      almacenamiento: equipo?.almacenamiento ?? "",
      grafica: equipo?.grafica ?? "",
      bateria: equipo?.bateria ?? "",
      bios: equipo?.bios ?? "",
      notas: equipo?.notas ?? "",
    },
  });
  const { register, handleSubmit, formState, setError } = form;
  const errores = formState.errors;
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarEquipo(datos, equipo?.id);
      if (!r.ok) {
        if (r.campo && r.campo in datos) setError(r.campo as keyof EquipoInput, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success(equipo ? "Equipo actualizado." : "Equipo registrado.");
      form.reset(datos as EquipoInput, { keepValues: true });
      if (panel && equipo) panel.cerrar(true);
      else if (panel) router.replace(`/panel/equipos/${r.data.id}`);
      else router.push(`/panel/equipos/${r.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identificación</CardTitle>
          <CardDescription>El número de serie es único por cliente y aparece en el encabezado de la ficha.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="cliente_id" etiqueta="Cliente" requerido error={errores.cliente_id?.message} className="sm:col-span-2">
            <Select {...register("cliente_id")} {...propsCampo("cliente_id", errores.cliente_id?.message)} disabled={Boolean(equipo)}>
              <option value="">Elige un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id="marca" etiqueta="Marca" error={errores.marca?.message}>
            <Input {...register("marca")} {...propsCampo("marca", errores.marca?.message)} placeholder="Lenovo" autoFocus={!clienteInicial} />
          </Campo>
          <Campo id="modelo" etiqueta="Modelo" error={errores.modelo?.message}>
            <Input {...register("modelo")} {...propsCampo("modelo", errores.modelo?.message)} placeholder="Tipo 83LT" />
          </Campo>
          <Campo id="serie" etiqueta="Número de serie" requerido error={errores.serie?.message} className="sm:col-span-2">
            <Input {...register("serie")} {...propsCampo("serie", errores.serie?.message)} placeholder="PF5Y6DJT" className="font-mono uppercase" />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Especificaciones</CardTitle>
          <CardDescription>Se rellenan solas al importar un diagnóstico (fase 7). Mientras tanto, escríbelas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {CAMPOS_SPEC.map((c) => (
            <Campo key={c.nombre} id={c.nombre} etiqueta={c.etiqueta} error={errores[c.nombre]?.message}>
              <Input {...register(c.nombre)} {...propsCampo(c.nombre, errores[c.nombre]?.message)} placeholder={c.placeholder} />
            </Campo>
          ))}
          <Campo id="notas" etiqueta="Notas" error={errores.notas?.message} className="sm:col-span-2">
            <Textarea {...register("notas")} {...propsCampo("notas", errores.notas?.message)} rows={3} />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones
        guardando={guardando}
        textoGuardar={equipo ? "Guardar cambios" : "Registrar equipo"}
        hrefCancelar={equipo ? `/panel/equipos/${equipo.id}` : clienteInicial ? `/panel/clientes/${clienteInicial}` : "/panel/equipos"}
        error={errorGeneral}
      />
    </form>
  );
}
