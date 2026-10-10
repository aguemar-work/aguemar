import { cn } from "@/lib/utils";

interface BracketsProps {
  className?: string;
  /** Color de los corchetes; por defecto hereda currentColor. */
  color?: string;
}

/**
 * Corchetes < > del logo como elemento decorativo grande y semitransparente.
 * Úsalo con opacity-10/12 en portadas y en el hero. Es puramente decorativo.
 */
export function Brackets({ className, color = "currentColor" }: BracketsProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 120"
      fill="none"
      className={cn("pointer-events-none select-none", className)}
    >
      <path
        d="M70 10 L18 60 L70 110"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M130 10 L182 60 L130 110"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
