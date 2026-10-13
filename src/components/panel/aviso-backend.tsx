import { AlertTriangle } from "lucide-react";

/** Aviso cuando faltan las variables de InsForge: la app compila pero no hay datos ni sesión. */
export function AvisoBackend() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn dark:border-warning-foreground/30 dark:bg-warning-bg dark:text-warning-foreground"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">InsForge no está configurado.</p>
        <p className="mt-0.5">
          Copia <code className="font-mono">.env.example</code> a <code className="font-mono">.env.local</code> con la
          URL y la anon key del proyecto, aplica las migraciones y reinicia el servidor. Mientras tanto puedes revisar la
          interfaz, pero no habrá sesión ni datos.
        </p>
      </div>
    </div>
  );
}
