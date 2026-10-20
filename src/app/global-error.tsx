"use client";

import "./globals.css";
import { useReportarError } from "@/lib/reportar-error";

/** Error en el layout raíz (reemplaza toda la página): mensaje mínimo y reintento. */
export default function ErrorGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useReportarError(error);

  return (
    <html lang="es-PE">
      <body className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background p-6 text-center text-foreground">
        <div className="max-w-md">
          <p className="font-mono text-xs text-muted-foreground">{"// error"}</p>
          <h1 className="mt-2 text-xl font-semibold">Algo salió mal al cargar aguemar.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Inténtalo otra vez en un momento.</p>
          {error.digest ? <p className="mt-1 font-mono text-xs text-muted-foreground">{error.digest}</p> : null}
        </div>
        <button type="button" onClick={reset} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
          Reintentar
        </button>
      </body>
    </html>
  );
}
