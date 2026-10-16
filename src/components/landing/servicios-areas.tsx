"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight } from "lucide-react";
import { TituloSeccion } from "@/components/landing/titulo-seccion";
import { AREAS_LANDING, textoPrecio, type ServicioLanding } from "@/lib/landing";
import type { Forma } from "@/lib/escena/formas";
import type { Area } from "@/types/database";
import { cn } from "@/lib/utils";

/** Cada área tiene su forma en la escena 3D y su glifo de respaldo. */
const ESTILO_AREA: Record<Area, { forma: Forma; glifo: string; lema: string }> = {
  diseno: { forma: "espiral", glifo: "Aa", lema: "orden, proporción e intención" },
  desarrollo: { forma: "llaves", glifo: "{ }", lema: "código que se puede mantener" },
  soporte: { forma: "chip", glifo: ">_", lema: "primero el diagnóstico, después la solución" },
};

/**
 * Servicios como pestañas de editor. Al cambiar de pestaña, `data-forma` de la sección
 * cambia y las partículas toman la forma del área. Los tres paneles están en el HTML (SEO).
 */
export function ServiciosAreas({ porArea }: { porArea: Record<Area, ServicioLanding[]> }) {
  const [activa, setActiva] = useState<Area>("diseno");
  const pestanas = useRef<Record<string, HTMLButtonElement | null>>({});

  // Los enlaces #diseno, #desarrollo y #soporte (portada) abren su pestaña.
  useEffect(() => {
    const leerHash = () => {
      const area = AREAS_LANDING.find((a) => `#${a.area}` === window.location.hash)?.area;
      if (area) setActiva(area);
    };
    leerHash();
    window.addEventListener("hashchange", leerHash);
    return () => window.removeEventListener("hashchange", leerHash);
  }, []);

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = AREAS_LANDING.findIndex((a) => a.area === activa);
    const destino =
      e.key === "ArrowRight" ? (i + 1) % AREAS_LANDING.length : e.key === "ArrowLeft" ? (i - 1 + AREAS_LANDING.length) % AREAS_LANDING.length : e.key === "Home" ? 0 : e.key === "End" ? AREAS_LANDING.length - 1 : null;
    if (destino === null) return;
    e.preventDefault();
    const area = AREAS_LANDING[destino]!.area;
    setActiva(area);
    pestanas.current[area]?.focus();
  };

  const estilo = ESTILO_AREA[activa];

  return (
    <section
      id="servicios"
      aria-labelledby="t-servicios"
      data-forma={estilo.forma}
      data-lado="0.45"
      data-escala="0.85"
      className="relative scroll-mt-20"
    >
      {AREAS_LANDING.map((a) => (
        <span key={a.area} id={a.area} aria-hidden className="absolute -top-20" />
      ))}
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
        <TituloSeccion
          n="01"
          id="t-servicios"
          titulo="Lo que hago"
          texto="Tres oficios que se cruzan todo el tiempo: cómo se ve tu empresa, qué usa cada día y qué la mantiene funcionando."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <div className="revelar">
            <div role="tablist" aria-label="Áreas" onKeyDown={alTeclear} className="flex gap-1 overflow-x-auto border-b border-white/10">
              {AREAS_LANDING.map((a) => {
                const sel = a.area === activa;
                return (
                  <button
                    key={a.area}
                    ref={(el) => {
                      pestanas.current[a.area] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`pestana-${a.area}`}
                    aria-selected={sel}
                    aria-controls={`panel-${a.area}`}
                    tabIndex={sel ? 0 : -1}
                    onClick={() => setActiva(a.area)}
                    className={cn(
                      "relative -mb-px shrink-0 rounded-t-md border-b-2 px-4 py-3 font-mono text-sm transition-colors",
                      sel ? "border-mint bg-white/[0.04] text-white" : "border-transparent text-white/50 hover:text-white/80",
                    )}
                  >
                    {a.rotulo}
                  </button>
                );
              })}
            </div>

            {AREAS_LANDING.map((a) => {
              const lista = porArea[a.area];
              return (
                <div key={a.area} id={`panel-${a.area}`} role="tabpanel" aria-labelledby={`pestana-${a.area}`} hidden={a.area !== activa} className="pt-8">
                  <h3 className="text-2xl font-semibold text-white sm:text-3xl">{a.titulo}</h3>
                  <p className="mt-3 max-w-lg text-white/65">{a.texto}</p>
                  {lista.length ? (
                    <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
                      {lista.map((s, i) => {
                        const precio = textoPrecio(s);
                        return (
                          <li key={s.id} className="group grid grid-cols-[2.5rem_1fr] gap-x-2 py-4">
                            <span className="pt-0.5 font-mono text-xs text-white/35 transition-colors group-hover:text-mint">{String(i + 1).padStart(2, "0")}</span>
                            <span>
                              <span className="block font-medium text-white transition-transform duration-300 group-hover:translate-x-1">{s.nombre}</span>
                              {s.descripcion ? <span className="mt-1 block text-sm text-white/55">{s.descripcion}</span> : null}
                              {precio ? <span className="mt-1 block font-mono text-xs text-mint/80">{precio}</span> : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-8 border-y border-white/10 py-5 text-white/55">Cada proyecto lo armo a medida: cuéntame qué necesitas y te propongo alcance y precio.</p>
                  )}
                  <a href="#contacto" className="mt-8 inline-flex items-center gap-2 font-medium text-mint underline-offset-4 hover:underline">
                    Consultar por {a.titulo.toLowerCase()} <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              );
            })}
          </div>

          {/* Espacio para la forma 3D del área; sin escena, un glifo grande hace de respaldo. */}
          <div aria-hidden className="relative hidden min-h-[440px] items-center justify-center lg:flex">
            {/* La animación de entrada va en el hijo: si no, su opacidad final taparía la de .solo-sin-escena. */}
            <span className="solo-sin-escena">
              <span key={activa} className="entrada block font-mono text-[9rem] font-semibold text-mint/15">
                {estilo.glifo}
              </span>
            </span>
            <p className="absolute bottom-0 right-0 font-mono text-xs text-white/40">{`// ${estilo.lema}`}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
