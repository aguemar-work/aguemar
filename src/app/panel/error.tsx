"use client";

import Link from "@/components/panel/enlace";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportarError } from "@/lib/reportar-error";

/**
 * Error de una página del panel: se muestra dentro del marco (barra lateral y
 * cabecera siguen ahí), con reintento y vuelta al inicio.
 */
export default function ErrorPanel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportarError(error);

  return (
    <section className="flex min-h-[50dvh] flex-col items-center justify-center gap-5 text-center" aria-live="polite">
      <div className="max-w-md">
        <p className="font-mono text-xs text-muted-foreground">{"// error"}</p>
        <h1 className="mt-2 text-xl font-semibold">No pude cargar esta sección.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Suele ser la conexión con la base. Reintenta; si sigue pasando, anota este código{error.digest ? ":" : "."}
        </p>
        {error.digest ? <p className="mt-1 font-mono text-xs text-muted-foreground">{error.digest}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="mint" onClick={reset}>
          <RotateCw /> Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/panel">Ir al inicio</Link>
        </Button>
      </div>
    </section>
  );
}
