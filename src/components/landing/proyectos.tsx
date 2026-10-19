import { Fila, ListaFilas } from "@/components/landing/fila";
import type { Proyecto } from "@/lib/landing-contenido";

/** "Lo que he construido": cada proyecto en una fila, con su etiqueta "hecho a medida" bajo el título, la solución y el stack. */
export function Proyectos({ proyectos, etiquetaMedida }: { proyectos: Proyecto[]; etiquetaMedida: string }) {
  return (
    <ListaFilas ordenada>
      {proyectos.map((p, i) => (
        <Fila
          key={p.clave}
          etiqueta={String(i + 1).padStart(2, "0")}
          titulo={
            <>
              {p.titulo}
              <span className="mt-1 block font-mono text-[11px] font-normal text-white/45">
                {`// ${etiquetaMedida}`}
              </span>
            </>
          }
          texto={p.solucion}
          chips={p.stack}
        />
      ))}
    </ListaFilas>
  );
}
