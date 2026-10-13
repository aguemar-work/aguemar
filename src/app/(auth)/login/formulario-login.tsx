"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesion, type EstadoLogin } from "../acciones";

const INICIAL: EstadoLogin = { ok: true };

export function FormularioLogin({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, INICIAL);
  const error = !estado.ok ? estado.mensaje : undefined;
  const errorEn = (campo: "correo" | "contrasena") => (error && (estado.campo ?? "contrasena") === campo ? error : undefined);

  return (
    <form action={accion} className="space-y-4" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
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
          aria-invalid={errorEn("correo") ? true : undefined}
          aria-describedby={errorEn("correo") ? "correo-error" : undefined}
        />
        {errorEn("correo") ? (
          <p id="correo-error" role="alert" className="text-sm text-danger">
            {errorEn("correo")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="contrasena">Contraseña</Label>
          <Link href="/login/recuperar" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
            ¿Olvidaste o aún no tienes contraseña?
          </Link>
        </div>
        <Input
          id="contrasena"
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={errorEn("contrasena") ? true : undefined}
          aria-describedby={errorEn("contrasena") ? "contrasena-error" : undefined}
        />
        {errorEn("contrasena") ? (
          <p id="contrasena-error" role="alert" className="text-sm text-danger">
            {errorEn("contrasena")}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pendiente ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
