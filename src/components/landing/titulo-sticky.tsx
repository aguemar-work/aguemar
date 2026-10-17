/**
 * Título de sección de la landing. En móvil es una barra pegada arriba con el rótulo mono
 * (`// servicios`); en escritorio queda en su sitio. El `h2` lleva el nombre real de la sección
 * en `sr-only`, así los lectores de pantalla (y los tests) ven "Lo que hago", no "// servicios".
 * Los márgenes negativos espejan el padding del contenedor de la página.
 */
export function TituloSticky({ id, rotulo, titulo }: { id: string; rotulo: string; titulo: string }) {
  return (
    <div className="sticky top-0 z-20 -mx-5 mb-5 bg-ink/75 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 md:-mx-12 md:px-12 lg:static lg:mx-0 lg:mb-8 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
      <h2 id={id} className="font-mono text-xs text-mint">
        <span aria-hidden>{`// ${rotulo}`}</span>
        <span className="sr-only">{titulo}</span>
      </h2>
    </div>
  );
}
