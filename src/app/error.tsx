"use client";

import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReportarError } from "@/lib/reportar-error";

/** Error inesperado en una página: se puede reintentar sin perder la sesión. */
export default function ErrorPagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportarError(error);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="max-w-md">
        <p className="font-mono text-xs text-muted-foreground">{"// error"}</p>
        <h1 className="mt-2 text-xl font-semibold">Algo salió mal al cargar esta página.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Puede ser la conexión. Inténtalo otra vez; si sigue pasando, avísanos{error.digest ? ` con este código: ` : "."}</p>
        {error.digest ? <p className="mt-1 font-mono text-xs text-muted-foreground">{error.digest}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="mint" onClick={reset}>
          <RotateCw /> Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Ir a mi espacio</Link>
        </Button>
      </div>
    </main>
  );
}
