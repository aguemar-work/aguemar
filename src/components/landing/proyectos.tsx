import { Check } from "lucide-react";
import { Fila, ListaFilas } from "@/components/landing/fila";
import { PROYECTOS } from "@/lib/landing-contenido";

/** "Lo que he construido": cada proyecto en una fila, con el reto, lo hecho y el stack. */
export function Proyectos() {
  return (
    <ListaFilas ordenada>
      {PROYECTOS.map((p, i) => (
        <Fila key={p.clave} etiqueta={String(i + 1).padStart(2, "0")} titulo={p.titulo} texto={p.reto} chips={p.stack}>
          <p className="mt-1 font-mono text-[11px] text-white/45">{p.areas.map((a) => `// ${a}`).join("  ")}</p>
          <ul className="mt-3 space-y-1.5">
            {p.hecho.map((h) => (
              <li key={h} className="flex gap-2 text-sm text-white/70">
                <Check className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </Fila>
      ))}
    </ListaFilas>
  );
}
