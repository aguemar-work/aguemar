"use client";

import Link from "@/components/panel/enlace";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { FASE_ACTUAL, MODULOS } from "@/lib/modulos";

interface Props {
  slug: string;
  nombreEmpresa: string;
  modulos: string[];
  onNavegar?: () => void;
  className?: string;
}

export function NavWorkspace({ slug, nombreEmpresa, modulos, onNavegar, className }: Props) {
  const pathname = usePathname();
  const base = `/w/${slug}`;
  const items = [
    { href: base, etiqueta: "Inicio", icono: LayoutDashboard, pronto: false },
    ...MODULOS.filter((m) => modulos.includes(m.clave)).map((m) => ({ href: `${base}/${m.ruta}`, etiqueta: m.etiqueta, icono: m.icono, pronto: m.fase > FASE_ACTUAL })),
  ];

  return (
    <nav aria-label="Secciones del workspace" className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <Link href={base} onClick={onNavegar} className="rounded-sm">
          <Logo variante="claro" alto={24} />
        </Link>
      </div>
      <div className="border-b border-white/10 px-5 py-3">
        <p className="font-mono text-[11px] text-mint">{"// workspace"}</p>
        <p className="truncate text-sm font-semibold text-white">{nombreEmpresa}</p>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map(({ href, etiqueta, icono: Icono, pronto }) => {
          const activo = href === base ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavegar}
                // Armazón en pantalla y página completa al pasar el cursor (ver Sidebar del panel).
                prefetch="auto"
                precargaAlPasar
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 hover:text-white",
                  activo ? "bg-white/10 text-white" : "text-sidebar-foreground/80",
                )}
              >
                <Icono className={cn("size-4 shrink-0", activo && "text-mint")} aria-hidden />
                {etiqueta}
                {pronto ? <span className="ml-auto font-mono text-[10px] text-sidebar-foreground/50">pronto</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-4 font-mono text-[11px] text-sidebar-foreground/60">aguemar · workspace</div>
    </nav>
  );
}
