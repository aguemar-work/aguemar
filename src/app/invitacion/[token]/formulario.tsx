"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { aceptarInvitacionSchema, type AceptarInvitacionInput } from "@/lib/validators/empresa";
import { aceptarConSesion, crearCuentaYAceptar } from "./acciones";

/** Sin sesión: la persona crea su contraseña; el correo es el de la invitación. */
export function FormularioInvitacion({ token, correo }: { token: string; correo: string }) {
  const [pendiente, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const { register, handleSubmit, formState, setError } = useForm<AceptarInvitacionInput>({
    resolver: zodResolver(aceptarInvitacionSchema),
    defaultValues: { contrasena: "", contrasena2: "" },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await crearCuentaYAceptar(token, datos);
      // Si salió bien, la acción redirige: solo vuelve aquí con un error.
      if (r && !r.ok) {
        if (r.campo === "contrasena" || r.campo === "contrasena2") setError(r.campo, { message: r.error });
        else setErrorGeneral(r.error);
      }
    }),
  );

  const yaTieneCuenta = errorGeneral && /ya tiene una cuenta/i.test(errorGeneral);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Correo</p>
        <p className="rounded-md border border-border bg-soft px-3 py-2 font-mono text-sm dark:bg-secondary">{correo}</p>
      </div>
      <Campo id="inv-pass" etiqueta="Crea tu contraseña" requerido error={e.contrasena?.message} ayuda="Mínimo 8 caracteres.">
        <Input {...register("contrasena")} {...propsCampo("inv-pass", e.contrasena?.message, "si")} type="password" autoComplete="new-password" />
      </Campo>
      <Campo id="inv-pass2" etiqueta="Repítela" requerido error={e.contrasena2?.message}>
        <Input {...register("contrasena2")} {...propsCampo("inv-pass2", e.contrasena2?.message)} type="password" autoComplete="new-password" />
      </Campo>
      {errorGeneral ? (
        <p role="alert" className="text-sm text-danger">
          {errorGeneral}{" "}
          {yaTieneCuenta ? (
            <Link href={`/login?siguiente=/invitacion/${token}`} className="font-medium underline underline-offset-2">
              Entrar
            </Link>
          ) : null}
        </p>
      ) : null}
      <Button type="submit" variant="mint" className="w-full" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />} Crear mi acceso
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        ¿Ya tienes cuenta con este correo?{" "}
        <Link href={`/login?siguiente=/invitacion/${token}`} className="underline underline-offset-2">
          Entra y acepta
        </Link>
      </p>
    </form>
  );
}

/** Con sesión del mismo correo: un clic para aceptar. */
export function AceptarConSesion({ token, correo }: { token: string; correo: string }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Entraste como <span className="font-mono text-foreground">{correo}</span>.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button
        variant="mint"
        className="w-full"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await aceptarConSesion(token);
            if (r && !r.ok) setError(r.error);
          })
        }
      >
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />} Aceptar invitación
      </Button>
    </div>
  );
}
