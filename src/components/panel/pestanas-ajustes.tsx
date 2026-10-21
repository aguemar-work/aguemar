import Link from "@/components/panel/enlace";
import { cn } from "@/lib/utils";
import { AJUSTES } from "./nav";

/** Pestañas comunes de Ajustes (Mi marca, Servicios, Plantillas, Equipo): se pasa de una a otra con un clic. */
export function PestanasAjustes({ actual }: { actual: string }) {
  return (
    <nav aria-label="Ajustes" className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1">
        {AJUSTES.map(({ href, etiqueta, icono: Icono }) => {
          const activo = href === actual;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  activo ? "border-mint-ink text-foreground dark:border-mint" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icono className={cn("size-4", activo && "text-mint-ink dark:text-mint")} aria-hidden />
                {etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
