import { Fragment, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Palabras en `<span>` con su índice (`--i`) para animarlas una tras otra. */
export function Palabras({ texto, desde = 0 }: { texto: string; desde?: number }) {
  return texto.split(" ").map((palabra, i) => (
    <Fragment key={i}>
      {i > 0 ? " " : null}
      <span style={{ "--i": i + desde } as CSSProperties}>{palabra}</span>
    </Fragment>
  ));
}

/** Título de sección de la landing: número mono (`// 01`), título que se revela palabra por palabra y bajada. */
export function TituloSeccion({ n, id, titulo, texto, className, children }: { n: string; id: string; titulo: string; texto?: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="font-mono text-sm text-mint">
        <span className="text-white/35">{"// "}</span>
        {n}
      </p>
      <h2 id={id} className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.05]">
        <span className="palabras-scroll">
          <Palabras texto={titulo} />
        </span>
      </h2>
      {texto ? <p className="revelar mt-4 text-lg text-white/65">{texto}</p> : null}
      {children}
    </div>
  );
}
