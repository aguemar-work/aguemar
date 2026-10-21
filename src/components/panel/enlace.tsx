import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * `Link` del panel, sin precarga por defecto.
 *
 * Muchos enlaces del panel abren una ficha en el panel lateral (rutas interceptadas, `@modal`). En un
 * build de producción, `next start`, la precarga de esas rutas deja la navegación atascada con
 * frecuencia: la petición del router termina bien pero la URL no cambia y el clic parece no hacer
 * nada. Medido con la misma prueba de navegador: con precarga, 2 de 6 sesiones abrían la ficha de una
 * empresa; sin ella, 6 de 6. Pasa `prefetch` explícito si un enlace concreto lo necesita.
 */
export default function Enlace({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
