import NextLink from "next/link";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof NextLink> & {
  /**
   * Precarga la página completa al pasar el cursor (en pantalla solo el armazón, con `prefetch="auto"`).
   * Solo para enlaces que no abren el panel lateral, como los del menú. Next lo expone como
   * `unstable_dynamicOnHover`, que los tipos de `next/link` aún no declaran.
   */
  precargaAlPasar?: boolean;
};

/**
 * `Link` del panel y del workspace, sin precarga por defecto.
 *
 * Muchos enlaces del panel abren una ficha en el panel lateral (rutas interceptadas, `@modal`). En un
 * build de producción, `next start`, la precarga de esas rutas deja la navegación atascada con
 * frecuencia: la petición del router termina bien pero la URL no cambia y el clic parece no hacer
 * nada. Medido con la misma prueba de navegador: con precarga, 2 de 6 sesiones abrían la ficha de una
 * empresa; sin ella, 6 de 6. Pasa `prefetch` explícito si un enlace concreto lo necesita.
 */
export default function Enlace({ prefetch = false, precargaAlPasar = false, ...props }: Props) {
  const alPasar = precargaAlPasar ? ({ unstable_dynamicOnHover: true } as unknown as Partial<ComponentProps<typeof NextLink>>) : {};
  return <NextLink prefetch={prefetch} {...alPasar} {...props} />;
}
