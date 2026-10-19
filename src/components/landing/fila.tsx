import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Filas de contenido de la landing (servicios, proyectos, pasos): etiqueta mono a la izquierda y
 * título, texto y chips a la derecha. En escritorio, al pasar el mouse por una fila las demás se
 * atenúan y la activa toma un fondo suave; en táctil no hay hover y todo se ve igual.
 */

export function ListaFilas({ children, ordenada, className }: { children: ReactNode; ordenada?: boolean; className?: string }) {
  const Etiqueta = ordenada ? "ol" : "ul";
  return <Etiqueta className={cn("group/lista", className)}>{children}</Etiqueta>;
}

export function Chip({ children, indice = 0 }: { children: ReactNode; indice?: number }) {
  // `--j` escalona la aparición de los chips (ver globals.css).
  return (
    <li className="chip rounded-full bg-mint/10 px-2.5 py-0.5 font-mono text-[11px] text-mint" style={{ "--j": indice } as CSSProperties}>
      {children}
    </li>
  );
}

export function Fila({
  etiqueta,
  titulo,
  texto,
  chips,
  nivel = "h3",
  lang,
  children,
}: {
  etiqueta: string;
  titulo: ReactNode;
  texto?: string | null;
  chips?: string[];
  nivel?: "h3" | "h4";
  /** Idioma del contenido cuando difiere del de la página (los servicios vienen en español). */
  lang?: string;
  children?: ReactNode;
}) {
  const Titulo = nivel;
  return (
    <li lang={lang} data-revelar className="group/fila relative -mx-4 grid gap-1 rounded-lg px-4 py-5 transition-[opacity,background-color] duration-200 md:grid-cols-[8rem_1fr] md:gap-x-4 lg:group-hover/lista:opacity-60 lg:hover:bg-white/[0.04] lg:hover:opacity-100!">
      <span className="font-mono text-xs text-white/45 md:pt-1">{etiqueta}</span>
      <div>
        <Titulo className="font-medium text-white transition-transform duration-200 lg:group-hover/fila:translate-x-0.5">{titulo}</Titulo>
        {texto ? <p className="mt-2 text-sm leading-relaxed text-white/65">{texto}</p> : null}
        {children}
        {chips?.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Etiquetas">
            {chips.map((c, i) => (
              <Chip key={c} indice={i}>
                {c}
              </Chip>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
