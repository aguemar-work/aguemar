import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CampoProps {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  requerido?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Envoltura de un campo de formulario: etiqueta, control, ayuda y error.
 * El control hijo debe usar el mismo `id` y, si hay error, `aria-invalid` y
 * `aria-describedby={`${id}-error`}` (usa `propsCampo`).
 */
export function Campo({ id, etiqueta, error, ayuda, requerido, className, children }: CampoProps) {
  // El * va oculto para lectores de pantalla: el control anuncia "obligatorio" con aria-required.
  const control =
    requerido && isValidElement(children)
      ? cloneElement(children as ReactElement<{ "aria-required"?: boolean }>, { "aria-required": true })
      : children;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {etiqueta}
        {requerido ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {control}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : ayuda ? (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

/** Atributos de accesibilidad para el control según haya error o ayuda. */
export function propsCampo(id: string, error?: string, ayuda?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
  };
}
