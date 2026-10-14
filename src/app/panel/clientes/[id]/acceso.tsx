"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ExternalLink, KeyRound, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { accesoEmpresaSchema, nuevaContrasenaSchema, type AccesoEmpresaInput, type NuevaContrasenaInput } from "@/lib/validators/empresa";
import { crearAccesoEmpresa, restablecerContrasenaEmpresa } from "../acciones";

interface Props {
  clienteId: string;
  slug: string | null;
  usuarioId: string | null;
  correoUsuario: string | null;
}

export function AccesoEmpresa({ clienteId, slug, usuarioId, correoUsuario }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceso al workspace</CardTitle>
        <CardDescription>
          Un usuario por empresa. Entra en{" "}
          {slug ? (
            <Link href={`/w/${slug}`} className="inline-flex items-center gap-1 font-mono underline-offset-4 hover:underline">
              /w/{slug} <ExternalLink className="size-3" aria-hidden />
            </Link>
          ) : (
            <span className="font-mono">/w/…</span>
          )}{" "}
          con el correo y la contraseña que definas aquí.
        </CardDescription>
      </CardHeader>
      <CardContent>{usuarioId ? <Restablecer clienteId={clienteId} usuarioId={usuarioId} correo={correoUsuario} /> : <Crear clienteId={clienteId} />}</CardContent>
    </Card>
  );
}

function Crear({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const { register, handleSubmit, formState, setError } = useForm<AccesoEmpresaInput>({
    resolver: zodResolver(accesoEmpresaSchema),
    defaultValues: { correo: "", contrasena: "" },
  });
  const errores = formState.errors;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await crearAccesoEmpresa(clienteId, datos);
      if (!r.ok) {
        if (r.campo === "correo" || r.campo === "contrasena") setError(r.campo, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success("Acceso creado. Comparte el correo y la contraseña con la empresa.");
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="acc-correo" etiqueta="Correo de acceso" requerido error={errores.correo?.message}>
          <Input {...register("correo")} {...propsCampo("acc-correo", errores.correo?.message)} type="email" autoComplete="off" placeholder="contacto@empresa.pe" />
        </Campo>
        <Campo id="acc-pass" etiqueta="Contraseña inicial" requerido error={errores.contrasena?.message} ayuda="Mínimo 8 caracteres. Se la entregas tú a la empresa.">
          <Input {...register("contrasena")} {...propsCampo("acc-pass", errores.contrasena?.message, "si")} type="text" autoComplete="off" className="font-mono" />
        </Campo>
      </div>
      {errorGeneral ? (
        <p role="alert" className="text-sm text-danger">
          {errorGeneral}
        </p>
      ) : null}
      <Button type="submit" variant="mint" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <UserPlus aria-hidden />} Crear acceso
      </Button>
    </form>
  );
}

function Restablecer({ clienteId, usuarioId, correo }: { clienteId: string; usuarioId: string; correo: string | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const { register, handleSubmit, formState, reset } = useForm<NuevaContrasenaInput>({
    resolver: zodResolver(nuevaContrasenaSchema),
    defaultValues: { contrasena: "" },
  });

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      const r = await restablecerContrasenaEmpresa(clienteId, usuarioId, datos.contrasena);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Contraseña actualizada. Compártela con la empresa.");
      reset();
      setAbierto(false);
      router.refresh();
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="ok" dot>
          Acceso activo
        </Badge>
        <span className="font-mono text-sm">{correo ?? usuarioId}</span>
      </div>
      {abierto ? (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Campo id="nueva-pass" etiqueta="Nueva contraseña" requerido error={formState.errors.contrasena?.message} className="flex-1">
            <Input {...register("contrasena")} {...propsCampo("nueva-pass", formState.errors.contrasena?.message)} type="text" autoComplete="off" className="font-mono" autoFocus />
          </Campo>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setAbierto(false)} disabled={pendiente}>
              Cancelar
            </Button>
            <Button type="submit" variant="mint" disabled={pendiente}>
              {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />} Guardar
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setAbierto(true)}>
          <KeyRound /> Restablecer contraseña
        </Button>
      )}
    </div>
  );
}
