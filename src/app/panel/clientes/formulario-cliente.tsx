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
import { abrirCreado } from "@/lib/navegacion";
import { clienteSchema, type ClienteDatos, type ClienteInput } from "@/lib/validators/cliente";
import type { ClienteRow } from "@/types/database";
import { guardarCliente } from "./acciones";

interface Props {
  cliente?: ClienteRow;
  /** A dónde ir después de guardar; por defecto, al detalle del cliente. */
  volverA?: string;
}

export function FormularioCliente({ cliente, volverA }: Props) {
  const panel = usePanelLateral();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<ClienteInput, unknown, ClienteDatos>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: cliente?.nombre ?? "",
      tipo_doc: cliente?.tipo_doc ?? "RUC",
      num_doc: cliente?.num_doc ?? "",
      contacto: cliente?.contacto ?? "",
      telefono: cliente?.telefono ?? "",
      correo: cliente?.correo ?? "",
      direccion: cliente?.direccion ?? "",
      notas: cliente?.notas ?? "",
    },
  });
  const { register, handleSubmit, formState, setError, watch } = form;
  const errores = formState.errors;
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);

  const tipoDoc = watch("tipo_doc");

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarCliente(datos, cliente?.id);
      if (!r.ok) {
        if (r.campo && r.campo in datos) {
          setError(r.campo as keyof ClienteInput, { message: r.error });
        } else {
          setErrorGeneral(r.error);
        }
        return;
      }
      toast.success(cliente ? "Empresa actualizada." : "Empresa creada.");
      form.reset(datos as ClienteInput, { keepValues: true });
      if (panel && cliente) panel.cerrar(true);
      else abrirCreado(volverA ?? `/panel/clientes/${r.data.id}`);
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identificación</CardTitle>
          <CardDescription>Razón social o nombre, y documento. El RUC y el DNI se validan al guardar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="nombre" etiqueta="Razón social o nombre" requerido error={errores.nombre?.message} className="sm:col-span-2">
            <Input {...register("nombre")} {...propsCampo("nombre", errores.nombre?.message)} autoFocus autoComplete="organization" />
          </Campo>
          <Campo id="tipo_doc" etiqueta="Tipo de documento" error={errores.tipo_doc?.message}>
            <Select {...register("tipo_doc")} {...propsCampo("tipo_doc", errores.tipo_doc?.message)}>
              <option value="RUC">RUC</option>
              <option value="DNI">DNI</option>
            </Select>
          </Campo>
          <Campo
            id="num_doc"
            etiqueta={tipoDoc === "RUC" ? "Número de RUC" : "Número de DNI"}
            ayuda={tipoDoc === "RUC" ? "11 dígitos" : "8 dígitos"}
            error={errores.num_doc?.message}
          >
            <Input
              {...register("num_doc")}
              {...propsCampo("num_doc", errores.num_doc?.message, "doc-ayuda")}
              inputMode="numeric"
              maxLength={tipoDoc === "RUC" ? 11 : 8}
              className="font-mono"
            />
          </Campo>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
          <CardDescription>Con quién coordinas y cómo le escribes.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="contacto" etiqueta="Persona de contacto" error={errores.contacto?.message}>
            <Input {...register("contacto")} {...propsCampo("contacto", errores.contacto?.message)} autoComplete="name" />
          </Campo>
          <Campo id="telefono" etiqueta="Teléfono" error={errores.telefono?.message} ayuda="Con código de país si no es de Perú.">
            <Input {...register("telefono")} {...propsCampo("telefono", errores.telefono?.message, "si")} inputMode="tel" autoComplete="tel" />
          </Campo>
          <Campo id="correo" etiqueta="Correo" error={errores.correo?.message}>
            <Input {...register("correo")} {...propsCampo("correo", errores.correo?.message)} type="email" inputMode="email" autoComplete="email" />
          </Campo>
          <Campo id="direccion" etiqueta="Dirección" error={errores.direccion?.message}>
            <Input {...register("direccion")} {...propsCampo("direccion", errores.direccion?.message)} autoComplete="street-address" />
          </Campo>
          <Campo id="notas" etiqueta="Notas internas" error={errores.notas?.message} className="sm:col-span-2" ayuda="Solo las ves tú; no salen en los documentos.">
            <Textarea {...register("notas")} {...propsCampo("notas", errores.notas?.message, "si")} rows={3} />
          </Campo>
        </CardContent>
      </Card>

      <BarraAcciones
        guardando={guardando}
        textoGuardar={cliente ? "Guardar cambios" : "Crear empresa"}
        hrefCancelar={cliente ? `/panel/clientes/${cliente.id}` : "/panel/clientes"}
        error={errorGeneral}
      />
    </form>
  );
}
