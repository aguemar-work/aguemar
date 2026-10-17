import { TituloSticky } from "@/components/landing/titulo-sticky";
import { Fila, ListaFilas } from "@/components/landing/fila";
import { AREAS_LANDING, textoPrecio, type ServicioLanding } from "@/lib/landing";
import type { Area } from "@/types/database";

/**
 * "Lo que hago": las tres áreas, una debajo de otra, con sus servicios en filas.
 * Todo está en el HTML (SEO) y los enlaces #diseno, #desarrollo y #soporte llevan a cada bloque.
 */
export function Servicios({ porArea }: { porArea: Record<Area, ServicioLanding[]> }) {
  return (
    <section id="servicios" aria-labelledby="t-servicios" className="mb-16 scroll-mt-16 lg:mb-24 lg:scroll-mt-24">
      <TituloSticky id="t-servicios" rotulo="servicios" titulo="Lo que hago" />
      <p className="mb-8 text-white/65">Tres oficios que se cruzan todo el tiempo: cómo se ve tu empresa, qué usa cada día y qué la mantiene funcionando.</p>
      <div className="space-y-12">
        {AREAS_LANDING.map((a) => {
          const lista = porArea[a.area];
          return (
            <div key={a.area} id={a.area} className="scroll-mt-16 lg:scroll-mt-24">
              <div className="grid gap-1 md:grid-cols-[8rem_1fr] md:gap-x-4">
                <p className="font-mono text-xs text-mint">{a.rotulo}</p>
                <div>
                  <h3 className="text-lg font-semibold text-white">{a.titulo}</h3>
                  <p className="mt-1 text-sm text-white/65">{a.texto}</p>
                </div>
              </div>
              {lista.length ? (
                <ListaFilas ordenada className="mt-2">
                  {lista.map((s, i) => {
                    const precio = textoPrecio(s);
                    return <Fila key={s.id} nivel="h4" etiqueta={String(i + 1).padStart(2, "0")} titulo={s.nombre} texto={s.descripcion} chips={precio ? [precio] : undefined} />;
                  })}
                </ListaFilas>
              ) : (
                <p className="mt-4 text-sm text-white/55 md:ml-[9rem]">Cada proyecto lo armo a medida: cuéntame qué necesitas y te propongo alcance y precio.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
