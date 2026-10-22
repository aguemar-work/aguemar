"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, MailCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  enviarCodigoRecuperacion,
  establecerContrasena,
  usarCodigoRecibido,
  verificarCodigoRecuperacion,
  type EstadoRecuperacion,
} from "../../acciones";

const INICIAL: EstadoRecuperacion = { paso: "correo", ok: true };

function Aviso({ texto, tipo }: { texto: string; tipo: "ok" | "error" }) {
  if (tipo === "error") {
    return (
      <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
        {texto}
      </p>
    );
  }
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-mint-ink/30 bg-mint-soft p-3 text-sm text-mint-ink dark:bg-success-bg dark:text-mint"
    >
      <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>{texto}</p>
    </div>
  );
}

/**
 * Los tres pasos de la contraseña (correo → código → nueva). Dentro de "Mi cuenta" arranca ya en el
 * código (`inicial`) y termina volviendo a la cuenta (`volver`) en vez de ir al inicio de sesión.
 */
export function FormularioRecuperar({ inicial, volver }: { inicial?: EstadoRecuperacion; volver?: { href: string; texto: string } } = {}) {
  const [estado, accion, pendiente] = useActionState<EstadoRecuperacion, FormData>(
    async (previo, formData) => {
      const paso = String(formData.get("paso") ?? previo.paso);
      // El botón que envió el formulario ("Ya tengo un código", "Pedir otro código").
      const ir = String(formData.get("ir") ?? "");
      if (ir === "tengo") return usarCodigoRecibido(previo, formData);
      if (ir === "reenviar") return enviarCodigoRecuperacion(previo, formData);
      if (paso === "contrasena") return establecerContrasena(previo, formData);
      if (paso === "codigo") return verificarCodigoRecuperacion(previo, formData);
      return enviarCodigoRecuperacion(previo, formData);
    },
    inicial ?? INICIAL,
  );

  if (estado.paso === "listo") {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="flex items-start gap-3 rounded-md border border-mint-ink/30 bg-mint-soft p-4 text-sm text-mint-ink dark:bg-success-bg dark:text-mint"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>{estado.mensaje}</p>
        </div>
        <Button asChild className="w-full">
          <Link href={volver?.href ?? "/login"}>{volver?.texto ?? "Ir a iniciar sesión"}</Link>
        </Button>
      </div>
    );
  }

  if (estado.paso === "contrasena") {
    return (
      <form action={accion} className="space-y-4" noValidate>
        <input type="hidden" name="paso" value="contrasena" />
        <input type="hidden" name="correo" value={estado.correo ?? ""} />
        <input type="hidden" name="token" value={estado.token ?? ""} />
        {!estado.ok && estado.mensaje ? <Aviso texto={estado.mensaje} tipo="error" /> : null}
        <div className="space-y-2">
          <Label htmlFor="contrasena">Nueva contraseña</Label>
          <Input id="contrasena" name="contrasena" type="password" autoComplete="new-password" minLength={8} required autoFocus />
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contrasena2">Repite la contraseña</Label>
          <Input id="contrasena2" name="contrasena2" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full" disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pendiente ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    );
  }

  if (estado.paso === "codigo") {
    return (
      <form action={accion} className="space-y-4" noValidate>
        <input type="hidden" name="paso" value="codigo" />
        <input type="hidden" name="correo" value={estado.correo ?? ""} />
        {estado.mensaje ? <Aviso texto={estado.mensaje} tipo={estado.ok ? "ok" : "error"} /> : null}
        <div className="space-y-2">
          <Label htmlFor="codigo">Código de 6 dígitos</Label>
          <Input
            id="codigo"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            required
            autoFocus
            className="font-mono text-lg tracking-[0.3em]"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pendiente ? "Verificando…" : "Continuar"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          ¿No llegó?{" "}
          <button
            type="submit"
            name="ir"
            value="reenviar"
            disabled={pendiente}
            className="underline-offset-4 hover:underline disabled:opacity-50"
          >
            Pedir otro código
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={accion} className="space-y-4" noValidate>
      <input type="hidden" name="paso" value="correo" />
      {!estado.ok && estado.mensaje ? <Aviso texto={estado.mensaje} tipo="error" /> : null}
      <div className="space-y-2">
        <Label htmlFor="correo">Correo</Label>
        <Input
          id="correo"
          name="correo"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="tu@correo.com"
          required
          autoFocus
          aria-invalid={!estado.ok ? true : undefined}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pendiente ? "Enviando…" : "Enviarme el código"}
      </Button>
      <Button type="submit" name="ir" value="tengo" variant="outline" className="w-full" disabled={pendiente}>
        Ya tengo un código
      </Button>
    </form>
  );
}
