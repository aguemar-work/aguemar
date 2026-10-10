"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarEnlaceMagico, type ResultadoEnlace } from "../acciones";

export function FormularioLogin({ siguiente }: { siguiente: string }) {
  const [resultado, accion, pendiente] = useActionState<ResultadoEnlace | null, FormData>(enviarEnlaceMagico, null);

  if (resultado?.ok) {
    return (
      <div role="status" className="rounded-md border border-mint-ink/30 bg-mint-soft p-4 text-sm text-mint-ink dark:bg-success-bg dark:text-mint">
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>{resultado.mensaje}</p>
        </div>
      </div>
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
          aria-invalid={resultado && !resultado.ok ? true : undefined}
          aria-describedby={resultado && !resultado.ok ? "correo-error" : undefined}
        />
        {resultado && !resultado.ok ? (
          <p id="correo-error" role="alert" className="text-sm text-danger">
            {resultado.mensaje}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {pendiente ? "Enviando…" : "Enviarme el enlace"}
      </Button>
    </form>
  );
}
