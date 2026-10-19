import { TituloSticky } from "@/components/landing/titulo-sticky";
import { Fila, ListaFilas } from "@/components/landing/fila";
import type { TextosLanding } from "@/lib/landing-textos";

/**
 * "Lo que hago": los dos oficios, cada uno con su descripción y las especialidades como etiquetas.
 * El catálogo de servicios con precios vive en el panel y en las cotizaciones, no aquí.
 */
export function Servicios({ t }: { t: TextosLanding["servicios"] }) {
  return (
    <section id="servicios" aria-labelledby="t-servicios" className="mb-16 scroll-mt-16 lg:mb-24 lg:scroll-mt-24">
      <TituloSticky id="t-servicios" rotulo={t.rotulo} titulo={t.titulo} />
      <p className="mb-6 text-white/65">{t.intro}</p>
      <ListaFilas>
        {t.bloques.map((b) => (
          <Fila key={b.rotulo} etiqueta={b.rotulo} titulo={b.titulo} texto={b.texto} chips={b.chips} />
        ))}
      </ListaFilas>
    </section>
  );
}
