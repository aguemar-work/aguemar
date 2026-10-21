"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { ExternalLink, KeyRound, Loader2, Send, UserX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { InvitacionPendiente } from "@/components/panel/invitacion-pendiente";
import { invitarEmpresaSchema, type InvitarEmpresaInput } from "@/lib/validators/empresa";
import { enviarRecuperacionEmpresa, invitarEmpresa, quitarAccesoEmpresa } from "../acciones";

interface Props {
  clienteId: string;
  slug: string | null;
  usuarioId: string | null;
  correoUsuario: string | null;
  /** Correo de contacto de la empresa, para sugerirlo al invitar. */
  correoSugerido: string | null;
  invitacion: { id: string; token: string; correo: string; expira_en: string } | null;
  /** Aceptó con una cuenta anterior a la invitación: se avisa para confirmarlo con la persona. */
  cuentaPrevia?: boolean;
  /** Estado del acceso (invitación, activa, sin ingresar…), junto al título. */
  estado?: React.ReactNode;
}

/**
 * Acceso al workspace por invitación: el propietario escribe el correo y comparte
 * el enlace; la persona fija su contraseña. Con acceso activo: enviar código de
 * recuperación o quitar el acceso.
 */
export function AccesoEmpresa({ clienteId, slug, usuarioId, correoUsuario, correoSugerido, invitacion, cuentaPrevia, estado }: Props) {
  const ruta = `/panel/clientes/${clienteId}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Acceso al workspace {estado}
        </CardTitle>
        <CardDescription>
          Un usuario por empresa. Entra en{" "}
          {slug ? (
            <Link href={`/w/${slug}`} className="inline-flex items-center gap-1 font-mono underline-offset-4 hover:underline">
              /w/{slug} <ExternalLink className="size-3" aria-hidden />
            </Link>
          ) : (
            <span className="font-mono">/w/…</span>
          )}{" "}
          con la contraseña que crea al aceptar tu invitación.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {usuarioId ? (
          <AccesoActivo clienteId={clienteId} correo={correoUsuario} cuentaPrevia={Boolean(cuentaPrevia)} />
        ) : invitacion ? (
          <InvitacionPendiente id={invitacion.id} token={invitacion.token} correo={invitacion.correo} expiraEn={invitacion.expira_en} tipo="empresa" ruta={ruta} />
        ) : (
          <Invitar clienteId={clienteId} correoSugerido={correoSugerido} />
        )}
      </CardContent>
    </Card>
  );
}

function Invitar({ clienteId, correoSugerido }: { clienteId: string; correoSugerido: string | null }) {
  const [pendiente, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const { register, handleSubmit, formState, setError } = useForm<InvitarEmpresaInput>({
    resolver: zodResolver(invitarEmpresaSchema),
    defaultValues: { correo: correoSugerido ?? "" },
  });
  const error = formState.errors.correo?.message;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await invitarEmpresa(clienteId, datos);
      if (!r.ok) {
        if (r.campo === "correo") setError("correo", { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success("Invitación lista. Copia el enlace o envíalo por WhatsApp.");
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Campo id="inv-correo" etiqueta="Correo de acceso" requerido error={error} ayuda="Le llega un enlace para crear su contraseña. Vence en 7 días.">
        <Input {...register("correo")} {...propsCampo("inv-correo", error, "si")} type="email" autoComplete="off" placeholder="contacto@empresa.pe" />
      </Campo>
      {errorGeneral ? (
        <p role="alert" className="text-sm text-danger">
          {errorGeneral}
        </p>
      ) : null}
      <Button type="submit" variant="mint" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />} Invitar
      </Button>
    </form>
  );
}

function AccesoActivo({ clienteId, correo, cuentaPrevia }: { clienteId: string; correo: string | null; cuentaPrevia: boolean }) {
  const [pendiente, iniciar] = useTransition();

  const recuperar = () =>
    iniciar(async () => {
      const r = await enviarRecuperacionEmpresa(clienteId);
      if (!r.ok) return void avisoError(r.error);
      toast.success(`Código enviado a ${r.data.correo}. Que entre a /login/recuperar, escriba su correo y elija «Ya tengo un código».`);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="ok" dot>
          Acceso activo
        </Badge>
        {correo ? <span className="font-mono text-sm">{correo}</span> : null}
      </div>
      {cuentaPrevia ? (
        <p role="status" className="rounded-md border border-border bg-warn-soft px-3 py-2 text-sm text-warn dark:bg-warning-bg dark:text-warning-foreground">
          Esta cuenta ya existía cuando se creó la invitación. Confirma con la persona que la creó ella: quien conociera el correo pudo registrarlo antes.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={recuperar} disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />} Enviar código de recuperación
        </Button>
        <ConfirmarEliminar
          titulo="¿Quitar el acceso de esta empresa?"
          descripcion="Su usuario deja de entrar al workspace al instante. Sus datos y documentos se conservan, y puedes invitarla de nuevo cuando quieras."
          accion={quitarAccesoEmpresa.bind(null, clienteId)}
          textoExito="Acceso quitado."
          variant="ghost"
        >
          <UserX aria-hidden /> Quitar acceso
        </ConfirmarEliminar>
      </div>
    </div>
  );
}
