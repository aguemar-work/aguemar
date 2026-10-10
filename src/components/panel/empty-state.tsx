import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icono?: LucideIcon;
  titulo: string;
  descripcion?: string;
  /** Botón o enlace que invita a actuar. */
  accion?: ReactNode;
  className?: string;
}

/** Estado vacío que invita a actuar: "Aún no hay cotizaciones. Crea la primera." */
export function EmptyState({ icono: Icono, titulo, descripcion, accion, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-soft/60 px-6 py-14 text-center dark:bg-secondary/40",
        className,
      )}
    >
      {Icono ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-mint-soft text-mint-ink dark:bg-success-bg dark:text-mint">
          <Icono className="size-6" aria-hidden />
        </div>
      ) : null}
      <h2 className="text-base font-semibold">{titulo}</h2>
      {descripcion ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descripcion}</p> : null}
      {accion ? <div className="mt-5">{accion}</div> : null}
    </div>
  );
}
