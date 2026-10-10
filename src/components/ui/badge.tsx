import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        /** Óptimo / Resuelto / Aceptada */
        ok: "border-transparent bg-success-bg text-success-foreground",
        /** Mejorable / Pendiente / Enviada */
        warn: "border-transparent bg-warning-bg text-warning-foreground",
        /** Crítico / Rechazada / Vencida */
        danger: "border-transparent bg-danger-soft text-danger dark:bg-danger/25 dark:text-red-200",
        /** Mono: números de documento, series */
        mono: "border-border bg-soft font-mono text-[11px] text-muted dark:bg-secondary dark:text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Muestra un punto de color antes del texto. */
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span aria-hidden className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
