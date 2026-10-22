"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { avisoError } from "@/lib/avisos";
import { FormularioRecuperar } from "@/app/(auth)/login/recuperar/formulario-recuperar";
import { pedirCodigoCuenta } from "../acciones";

/** Pide el código al correo de la sesión y sigue los pasos de /login/recuperar sin salir de Mi cuenta. */
export function CambiarContrasena({ slug }: { slug: string }) {
  const [pendiente, iniciar] = useTransition();
  const [codigo, setCodigo] = useState<{ correo: string; mensaje: string } | null>(null);

  if (codigo) {
    return <FormularioRecuperar inicial={{ paso: "codigo", correo: codigo.correo, ok: true, mensaje: codigo.mensaje }} volver={{ href: `/w/${slug}/cuenta`, texto: "Volver a mi cuenta" }} />;
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await pedirCodigoCuenta();
          if (!r.ok) return void avisoError(r.error);
          setCodigo(r.data);
        })
      }
    >
      {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />} Enviarme un código
    </Button>
  );
}
