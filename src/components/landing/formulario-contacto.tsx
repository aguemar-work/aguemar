"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { MENSAJES_LEAD, SIN_CANAL, crearLeadSchema, type LeadDatos, type LeadInput } from "@/lib/validators/lead";
import { conTextoWhatsApp } from "@/lib/landing";
import { TEXTOS, type Idioma } from "@/lib/landing-textos";
import { enviarContacto } from "@/app/acciones";
import { leerOrigen } from "@/components/landing/medicion";

/**
 * Campos del formulario sobre el fondo oscuro de la landing: sin tarjeta, borde fino translúcido,
 * etiquetas mono y foco mint, igual que el resto de la página.
 */
const CAMPO = "h-11 border-white/15 bg-white/[0.04] text-white shadow-none placeholder:text-white/35 hover:border-white/30 focus-visible:border-mint";

/**
 * Formulario de contacto corto (nombre, WhatsApp o correo, mensaje): guarda un lead que llega al panel.
 * Es la segunda vía; la primera son los enlaces directos de WhatsApp y correo que van encima.
 */
export function FormularioContacto({ whatsapp, idioma = "es" }: { whatsapp: string | null; idioma?: Idioma }) {
  const t = TEXTOS[idioma].form;
  const [enviando, iniciar] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string>();
  /** Enlace de WhatsApp con el mensaje ya escrito, cuando no se pudo guardar ni enviar por correo. */
  const [sinCanal, setSinCanal] = useState<string | null>(null);
  const form = useForm<LeadInput, unknown, LeadDatos>({
    resolver: zodResolver(crearLeadSchema(MENSAJES_LEAD[idioma])),
    defaultValues: { nombre: "", telefono: "", correo: "", mensaje: "", sitio_web: "" },
  });
  const { register, handleSubmit, formState, setError, reset } = form;
  const e = formState.errors;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      setSinCanal(null);
      const r = await enviarContacto(datos, idioma, leerOrigen());
      if (!r.ok) {
        if (r.campo === SIN_CANAL) {
          setErrorGeneral(r.error);
          setSinCanal(whatsapp ? conTextoWhatsApp(whatsapp, `${idioma === "en" ? "Hi, I'm" : "Hola, soy"} ${datos.nombre}. ${datos.mensaje}`.slice(0, 1500)) : "");
        } else if (r.campo) setError(r.campo as FieldPath<LeadInput>, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      reset();
      setEnviado(true);
    }),
  );

  if (enviado) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 border-l-2 border-mint pl-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <CheckCircle2 className="size-7 text-mint" aria-hidden />
        <h3 className="text-xl font-semibold text-white">{t.graciasTitulo}</h3>
        <p className="text-white/65">{t.graciasTexto}</p>
        <div className="flex flex-wrap gap-2">
          {whatsapp ? (
            <Button asChild variant="mint">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                {t.escribirWhatsApp}
              </a>
            </Button>
          ) : null}
          <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => setEnviado(false)}>
            {t.otroMensaje}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-x-4 gap-y-5 sm:grid-cols-2 [&_label]:font-mono [&_label]:text-xs [&_label]:font-normal [&_label]:text-white/60 [&_p[id$=-ayuda]]:text-white/40">
      <Campo id="lead-nombre" etiqueta={t.nombre} requerido error={e.nombre?.message} className="sm:col-span-2">
        <Input {...register("nombre")} {...propsCampo("lead-nombre", e.nombre?.message)} autoComplete="name" className={CAMPO} />
      </Campo>
      <Campo id="lead-telefono" etiqueta={t.whatsapp} error={e.telefono?.message} ayuda={t.unoDeLosDos}>
        <Input {...register("telefono")} {...propsCampo("lead-telefono", e.telefono?.message, "si")} type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" className={`${CAMPO} font-mono`} />
      </Campo>
      <Campo id="lead-correo" etiqueta={t.correo} error={e.correo?.message}>
        <Input {...register("correo")} {...propsCampo("lead-correo", e.correo?.message)} type="email" autoComplete="email" className={CAMPO} />
      </Campo>
      <Campo id="lead-mensaje" etiqueta={t.mensaje} requerido error={e.mensaje?.message} className="sm:col-span-2">
        <Textarea {...register("mensaje")} {...propsCampo("lead-mensaje", e.mensaje?.message)} rows={5} placeholder={t.mensajePlaceholder} className={`${CAMPO} h-auto min-h-32 py-3`} />
      </Campo>
      {/* Trampa para bots: oculta para personas y lectores de pantalla. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-sitio">{t.sitio}</label>
        <input id="lead-sitio" tabIndex={-1} autoComplete="off" {...register("sitio_web")} />
      </div>
      {sinCanal !== null ? (
        <div role="alert" className="flex flex-col items-start gap-3 border-l-2 border-mint pl-5 sm:col-span-2">
          <p className="font-semibold text-white">{t.sinCanalTitulo}</p>
          <p className="text-white/65">{sinCanal ? t.sinCanalTexto : t.sinCanalSinWhatsApp}</p>
          {sinCanal ? (
            <Button asChild variant="mint">
              <a href={sinCanal} target="_blank" rel="noopener noreferrer" data-evento="whatsapp_click">
                <MessageCircle /> {t.enviarPorWhatsApp}
              </a>
            </Button>
          ) : null}
        </div>
      ) : errorGeneral ? (
        <p role="alert" className="text-sm text-danger sm:col-span-2">
          {errorGeneral}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/50">
          {t.datos}{" "}
          <Link href="/privacidad" className="underline underline-offset-2 hover:text-white">
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
