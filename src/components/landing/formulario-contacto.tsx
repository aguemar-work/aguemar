"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { AREAS_LANDING, type ServicioLanding } from "@/lib/landing";
import { MENSAJES_LEAD, crearLeadSchema, type LeadDatos, type LeadInput } from "@/lib/validators/lead";
import { TEXTOS, type Idioma } from "@/lib/landing-textos";
import { enviarContacto } from "@/app/acciones";

/** Formulario de contacto: guarda un lead que llega al panel. */
export function FormularioContacto({ servicios, whatsapp, idioma = "es" }: { servicios: ServicioLanding[]; whatsapp: string | null; idioma?: Idioma }) {
  const t = TEXTOS[idioma].form;
  const areas = TEXTOS[idioma].servicios.areas;
  const [enviando, iniciar] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const form = useForm<LeadInput, unknown, LeadDatos>({
    resolver: zodResolver(crearLeadSchema(MENSAJES_LEAD[idioma])),
    defaultValues: { nombre: "", empresa: "", telefono: "", correo: "", interes: "", mensaje: "", sitio_web: "" },
  });
  const { register, handleSubmit, formState, setError, reset } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await enviarContacto(datos, idioma);
      if (!r.ok) {
        if (r.campo) setError(r.campo as FieldPath<LeadInput>, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      reset();
      setEnviado(true);
    }),
  );

  if (enviado) {
    return (
      <div role="status" className="flex h-full flex-col items-start justify-center gap-3 rounded-xl border border-border bg-card p-6 sm:p-8">
        <CheckCircle2 className="size-8 text-mint-ink dark:text-mint" aria-hidden />
        <h3 className="text-xl font-semibold">{t.graciasTitulo}</h3>
        <p className="text-muted-foreground">{t.graciasTexto}</p>
        <div className="flex flex-wrap gap-2">
          {whatsapp ? (
            <Button asChild variant="mint">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                {t.escribirWhatsApp}
              </a>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setEnviado(false)}>
            {t.otroMensaje}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2 sm:p-8">
      <Campo id="lead-nombre" etiqueta={t.nombre} requerido error={e.nombre?.message}>
        <Input {...register("nombre")} {...propsCampo("lead-nombre", e.nombre?.message)} autoComplete="name" />
      </Campo>
      <Campo id="lead-empresa" etiqueta={t.empresa} ayuda={t.opcional}>
        <Input {...register("empresa")} {...propsCampo("lead-empresa", undefined, "si")} autoComplete="organization" />
      </Campo>
      <Campo id="lead-telefono" etiqueta={t.whatsapp} error={e.telefono?.message}>
        <Input {...register("telefono")} {...propsCampo("lead-telefono", e.telefono?.message)} type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" className="font-mono" />
      </Campo>
      <Campo id="lead-correo" etiqueta={t.correo} error={e.correo?.message}>
        <Input {...register("correo")} {...propsCampo("lead-correo", e.correo?.message)} type="email" autoComplete="email" />
      </Campo>
      <Campo id="lead-interes" etiqueta={t.interes} className="sm:col-span-2">
        <Select {...register("interes")} {...propsCampo("lead-interes")}>
          <option value="">{t.sinDefinir}</option>
          {AREAS_LANDING.map((a) => {
            const lista = servicios.filter((s) => s.area === a.area);
            return (
              <optgroup key={a.area} label={areas[a.area].titulo}>
                {lista.map((s) => (
                  <option key={s.id} value={`${a.titulo}: ${s.nombre}`}>
                    {s.nombre}
                  </option>
                ))}
                <option value={`${a.titulo}: otro`}>{lista.length ? areas[a.area].otro : areas[a.area].titulo}</option>
              </optgroup>
            );
          })}
        </Select>
      </Campo>
      <Campo id="lead-mensaje" etiqueta={t.mensaje} requerido error={e.mensaje?.message} className="sm:col-span-2">
        <Textarea {...register("mensaje")} {...propsCampo("lead-mensaje", e.mensaje?.message)} rows={4} placeholder={t.mensajePlaceholder} />
      </Campo>
      {/* Trampa para bots: oculta para personas y lectores de pantalla. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-sitio">{t.sitio}</label>
        <input id="lead-sitio" tabIndex={-1} autoComplete="off" {...register("sitio_web")} />
      </div>
      {errorGeneral ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errorGeneral}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {t.datos}{" "}
          <Link href="/privacidad" className="underline underline-offset-2 hover:text-foreground">
            {t.comoLosTrato}
          </Link>
          .
        </p>
        <Button type="submit" variant="mint" size="lg" disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : <Send />} {t.enviar}
        </Button>
      </div>
    </form>
  );
}
