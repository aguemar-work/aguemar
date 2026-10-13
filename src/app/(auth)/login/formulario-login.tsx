"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarCodigo, verificarCodigo, type EstadoLogin } from "../acciones";

const INICIAL: EstadoLogin = { paso: "correo", ok: true };

export function FormularioLogin({ siguiente }: { siguiente: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(
    async (previo, formData) =>
      previo.paso === "codigo" && formData.get("codigo") !== null
        ? verificarCodigo(previo, formData)
        : enviarCodigo(previo, formData),
    INICIAL,
  );

  const error = !estado.ok ? estado.mensaje : undefined;

  if (estado.paso === "codigo") {
    return (
      <form action={accion} className="space-y-4" noValidate>
        <input type="hidden" name="siguiente" value={siguiente} />
        <input type="hidden" name="correo" value={estado.correo ?? ""} />
        {estado.ok && estado.mensaje ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-md border border-mint-ink/30 bg-mint-soft p-3 text-sm text-mint-ink dark:bg-success-bg dark:text-mint"
          >
            <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p>{estado.mensaje}</p>
          </div>
        ) : null}
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
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "codigo-error" : undefined}
          />
          {error ? (
            <p id="codigo-error" role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pendiente ? "Verificando…" : "Entrar"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          ¿No llegó?{" "}
          <button
            type="submit"
            name="reenviar"
            value="1"
            formNoValidate
            className="underline-offset-4 hover:underline"
            onClick={(e) => {
              // Reenviar: enviamos el formulario sin el campo "codigo" para volver al paso 1.
              const form = e.currentTarget.form;
              form?.querySelector<HTMLInputElement>("#codigo")?.setAttribute("disabled", "true");
            }}
          >
            Enviar otro código
          </button>
        </p>
      </form>
    );
  }

  return (
    <form action={accion} className="space-y-4" noValidate>
      <input type="hidden" name="siguiente" value={siguiente} />
      <div className="space-y-2">
        <Label htmlFor="correo">Correo</Label>
        <Input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "correo-error" : undefined}
        />
        {error ? (
          <p id="correo-error" role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pendiente ? "Enviando…" : "Enviarme el código"}
      </Button>
    </form>
  );
}
