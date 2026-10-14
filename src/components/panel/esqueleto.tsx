import { cn } from "@/lib/utils";

/** Bloque gris que late mientras llegan los datos. */
export function Bloque({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-secondary/80 dark:bg-secondary/50", className)} />;
}

function Cargando({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Cargando…</span>
      {children}
    </div>
  );
}

function Encabezado() {
  return (
    <div className="mb-6 space-y-2">
      <Bloque className="h-3 w-8" />
      <Bloque className="h-7 w-64 max-w-full" />
      <Bloque className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** Página con indicadores y lista (inicio, listas). */
export function EsqueletoPagina() {
  return (
    <Cargando>
      <Encabezado />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Bloque key={i} className="h-24" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Bloque key={i} className="h-14" />
          ))}
        </div>
        <Bloque className="h-64" />
      </div>
    </Cargando>
  );
}

/** Formulario en tarjetas. */
export function EsqueletoFormulario() {
  return (
    <Cargando className="mx-auto max-w-3xl">
      <Encabezado />
      <div className="space-y-6">
        {[4, 4, 2].map((n, i) => (
          <div key={i} className="space-y-4 rounded-lg border border-border p-5">
            <Bloque className="h-5 w-40" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: n }, (_, j) => (
                <div key={j} className="space-y-2">
                  <Bloque className="h-3 w-24" />
                  <Bloque className="h-10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Cargando>
  );
}

/** Detalle con columna de datos y columna principal. */
export function EsqueletoDetalle() {
  return (
    <Cargando>
      <Encabezado />
      <div className="grid gap-6 lg:grid-cols-3">
        <Bloque className="h-72" />
        <div className="space-y-4 lg:col-span-2">
          <Bloque className="h-56" />
          <Bloque className="h-32" />
        </div>
      </div>
    </Cargando>
  );
}
