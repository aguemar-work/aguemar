/** Enlace "Saltar al contenido": invisible hasta que recibe el foco con el teclado. Apunta a `id="contenido"`. */
export function SaltarContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-mint focus:px-3 focus:py-2 focus:text-ink"
    >
      Saltar al contenido
    </a>
  );
}
