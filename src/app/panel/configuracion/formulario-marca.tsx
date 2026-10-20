"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { useAvisoCambios } from "@/components/formulario/use-aviso-cambios";
import { basisAPorcentaje, marcaSchema, type MarcaDatos, type MarcaInput } from "@/lib/validators/marca";
import type { PerfilMarcaRow } from "@/types/database";
import { guardarMarca } from "./acciones";
import { VistaPreviaMarca } from "./vista-previa-marca";

interface Props {
  perfil: PerfilMarcaRow | null;
}

export function FormularioMarca({ perfil }: Props) {
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();

  const form = useForm<MarcaInput, unknown, MarcaDatos>({
    resolver: zodResolver(marcaSchema),
    defaultValues: {
      nombre_comercial: perfil?.nombre_comercial ?? "aguemar",
      responsable: perfil?.responsable ?? "Alejandro Fritz Guevara Martínez",
      cargo: perfil?.cargo ?? "Diseño, desarrollo y soporte técnico",
      ruc: perfil?.ruc ?? "",
      telefono: perfil?.telefono ?? "",
      correo: perfil?.correo ?? "",
      web: perfil?.web ?? "",
      direccion: perfil?.direccion ?? "",
      igv_porcentaje: basisAPorcentaje(perfil?.igv_pct ?? 1800),
      moneda_default: perfil?.moneda_default ?? "PEN",
      validez_dias_default: perfil?.validez_dias_default ?? 15,
      plazo_pago_dias_default: perfil?.plazo_pago_dias_default ?? 15,
      condiciones_default: perfil?.condiciones_default ?? "",
      pago_cuenta: perfil?.pago_cuenta ?? "",
      pago_cci: perfil?.pago_cci ?? "",
      pago_yape: perfil?.pago_yape ?? "",
      pago_plin: perfil?.pago_plin ?? "",
    },
  });
  const { register, handleSubmit, formState, setError, watch } = form;
  const valores = watch();
  const errores = formState.errors;
  useAvisoCambios(formState.isDirty && !formState.isSubmitSuccessful);

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarMarca(datos);
      if (!r.ok) {
        if (r.campo && r.campo in datos) setError(r.campo as keyof MarcaInput, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success("Datos de la marca guardados.");
      form.reset(datos as MarcaInput, { keepValues: true });
    }),
  );

  const campo = (nombre: keyof MarcaInput, etiqueta: string, extra?: { requerido?: boolean; ayuda?: string; placeholder?: string; mono?: boolean; type?: string; className?: string }) => (
    <Campo id={`m-${nombre}`} etiqueta={etiqueta} requerido={extra?.requerido} ayuda={extra?.ayuda} error={errores[nombre]?.message as string | undefined} className={extra?.className}>
      <Input
        {...register(nombre, extra?.type === "number" ? { valueAsNumber: true } : undefined)}
        {...propsCampo(`m-${nombre}`, errores[nombre]?.message as string | undefined, extra?.ayuda)}
        placeholder={extra?.placeholder}
        type={extra?.type}
        step={extra?.type === "number" ? "any" : undefined}
        className={extra?.mono ? "font-mono" : undefined}
      />
    </Campo>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <nav aria-label="Secciones" className="flex flex-wrap gap-2 text-xs">
          {[
            ["#identidad", "Identidad"],
            ["#contacto", "Contacto"],
            ["#cotizaciones", "Cotizaciones"],
            ["#pago", "Pago"],
          ].map(([href, texto]) => (
            <a key={href} href={href} className="rounded-full border border-border px-3 py-1 text-muted-foreground hover:border-mint-ink/40 hover:text-foreground">
              {texto}
            </a>
          ))}
        </nav>
        <Card id="identidad" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Identidad</CardTitle>
            <CardDescription>Aparece en la portada, la firma y el pie de los documentos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {campo("nombre_comercial", "Nombre comercial", { requerido: true })}
            {campo("ruc", "RUC", { mono: true, placeholder: "10XXXXXXXXX", ayuda: "11 dígitos" })}
            {campo("responsable", "Responsable", { requerido: true, ayuda: "Firma los documentos." })}
            {campo("cargo", "Cargo", { requerido: true })}
          </CardContent>
        </Card>

        <Card id="contacto" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
            <CardDescription>Va en la tarjeta oscura al final de cada documento y en la landing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {campo("telefono", "Teléfono / WhatsApp", { placeholder: "+51 9XX XXX XXX" })}
            {campo("correo", "Correo", { type: "email" })}
            {campo("web", "Sitio web", { placeholder: "https://" })}
            {campo("direccion", "Dirección")}
          </CardContent>
        </Card>

        <Card id="cotizaciones" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Cotizaciones</CardTitle>
            <CardDescription>Valores por defecto al crear una cotización; se pueden cambiar en cada una.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {campo("igv_porcentaje", "IGV (%)", { requerido: true, type: "number", mono: true })}
            <Campo id="m-moneda" etiqueta="Moneda" error={errores.moneda_default?.message}>
              <Select {...register("moneda_default")} {...propsCampo("m-moneda", errores.moneda_default?.message)}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares (US$)</option>
              </Select>
            </Campo>
            {campo("validez_dias_default", "Validez (días)", { requerido: true, type: "number", mono: true })}
            {campo("plazo_pago_dias_default", "Plazo de pago (días)", { requerido: true, type: "number", mono: true, ayuda: "Desde que la aceptan. 0 = al contado." })}
            <Campo id="m-condiciones" etiqueta="Condiciones por defecto" error={errores.condiciones_default?.message} className="sm:col-span-2 xl:col-span-4" ayuda="Una condición por línea.">
              <Textarea {...register("condiciones_default")} {...propsCampo("m-condiciones", errores.condiciones_default?.message, "si")} rows={4} />
            </Campo>
          </CardContent>
        </Card>

        <Card id="pago" className="scroll-mt-20">
          <CardHeader>
            <CardTitle>Datos de pago</CardTitle>
            <CardDescription>Se imprimen en la sección de datos de pago de la cotización. Deja vacío lo que no uses.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {campo("pago_cuenta", "Cuenta bancaria", { mono: true, placeholder: "BCP 191-XXXXXXXX-0-XX" })}
            {campo("pago_cci", "CCI", { mono: true, placeholder: "002-191-XXXXXXXXXXXX-XX" })}
            {campo("pago_yape", "Yape", { mono: true, placeholder: "9XX XXX XXX" })}
            {campo("pago_plin", "Plin", { mono: true, placeholder: "9XX XXX XXX" })}
          </CardContent>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 border-t border-border bg-background/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p role={errorGeneral ? "alert" : undefined} className="text-sm text-danger">
            {errorGeneral}
          </p>
          <Button type="submit" variant="mint" disabled={guardando || (Boolean(perfil) && !formState.isDirty)}>
            {guardando ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {guardando ? "Guardando…" : formState.isDirty ? "Guardar cambios" : "Guardado"}
          </Button>
        </div>
      </form>
      <aside className="order-first lg:order-none">
        <div className="lg:sticky lg:top-20">
          <VistaPreviaMarca valores={valores} />
        </div>
      </aside>
    </div>
  );
}
