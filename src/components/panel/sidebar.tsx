"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { navPara, type RolPanel } from "./nav";

interface SidebarProps {
  /** Llamado al navegar (para cerrar el sheet en móvil). */
  onNavegar?: () => void;
  className?: string;
  rol?: RolPanel;
}

export function Sidebar({ onNavegar, className, rol = "propietario" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del panel" className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", className)}>
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Link href="/panel" onClick={onNavegar} className="rounded-sm">
          <Logo variante="claro" alto={28} />
        </Link>
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto p-3">
        {navPara(rol).map(({ href, etiqueta, icono: Icono, tambien }) => {
          const activo = href === "/panel" ? pathname === href : [href, ...(tambien ?? [])].some((r) => pathname.startsWith(r));
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavegar}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "ring-offset-sidebar hover:bg-white/5 hover:text-white",
                  activo ? "bg-white/10 text-white" : "text-sidebar-foreground/80",
                )}
              >
                <Icono className={cn("size-4 shrink-0", activo && "text-mint")} aria-hidden />
                {etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-white/10 p-4 font-mono text-[11px] text-sidebar-foreground/60">
        {rol === "colaborador" ? "aguemar · equipo" : "aguemar · soporte técnico"}
      </div>
    </nav>
  );
}
