import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  titulo: string;
  descripcion?: string;
  /** Numeración mono en verde, p. ej. "01". Opcional. */
  codigo?: string;
  acciones?: ReactNode;
  className?: string;
}

export function PageHeader({ titulo, descripcion, codigo, acciones, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {codigo ? (
          <span className="mb-1 block font-mono text-xs font-semibold text-mint-ink dark:text-mint">{codigo}</span>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion ? <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex shrink-0 items-center gap-2">{acciones}</div> : null}
    </div>
  );
}
