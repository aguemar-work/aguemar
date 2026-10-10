import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "oscuro" = logo en ink para fondos claros; "claro" = logo blanco para fondos oscuros. */
  variante?: "oscuro" | "claro";
  className?: string;
  /** Alto en px; el ancho se calcula con la proporción del viewBox (12720 × 5835). */
  alto?: number;
  priority?: boolean;
}

const PROPORCION = 12720 / 5835;

/** Logo de agueMar recortado desde LOGO.svg (ver scripts/crop-logo.mjs). */
export function Logo({ variante = "oscuro", className, alto = 36, priority }: LogoProps) {
  const src = variante === "claro" ? "/logo-light.svg" : "/logo.svg";
  return (
    <Image
      src={src}
      alt="agueMar"
      height={alto}
      width={Math.round(alto * PROPORCION)}
      priority={priority}
      className={cn("h-auto select-none", className)}
      unoptimized
    />
  );
}
