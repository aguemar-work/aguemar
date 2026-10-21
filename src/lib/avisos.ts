import { toast } from "sonner";

/**
 * Error para el usuario en un aviso emergente: dura 10 s (los demás avisos, 6 s) y se cierra con la X.
 * Un error que desaparece antes de leerse no se puede recuperar (WCAG 2.2.1, A11Y-004).
 */
export function avisoError(mensaje: string) {
  toast.error(mensaje, { duration: 10_000 });
}
