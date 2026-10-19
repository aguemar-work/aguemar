import Link from "next/link";
import { cn } from "@/lib/utils";
import { IDIOMAS, RUTA_IDIOMA, type Idioma } from "@/lib/landing-textos";

/** Selector ES / EN de la landing: son enlaces a /  y /en (la versión activa lleva `aria-current`). */
export function SelectorIdioma({ idioma, etiqueta }: { idioma: Idioma; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta}>
      <ul className="flex items-center gap-1 font-mono text-xs">
        {IDIOMAS.map((i) => {
          const activo = i === idioma;
          return (
            <li key={i}>
              <Link
                href={RUTA_IDIOMA[i]}
                hrefLang={i}
                lang={i}
                aria-current={activo ? "true" : undefined}
                aria-label={i === "es" ? "Español" : "English"}
                className={cn("rounded-sm px-2 py-1 uppercase tracking-[0.15em] transition-colors", activo ? "bg-mint/15 text-mint" : "text-white/55 hover:text-white")}
              >
                {i}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
