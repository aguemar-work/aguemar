import {
  LayoutDashboard,
  Users,
  Laptop,
  Wrench,
  KanbanSquare,
  CalendarDays,
  FileText,
  ClipboardList,
  FileBarChart,
  Inbox,
  ListChecks,
  MessagesSquare,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface ItemNav {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Otras rutas que marcan este ítem como activo. */
  tambien?: string[];
  /** Solo el propietario lo ve: dinero, leads, marca, empresas y equipo. */
  soloPropietario?: boolean;
}

export interface GrupoNav {
  /** Rótulo del grupo; el primero va sin rótulo. */
  titulo: string | null;
  items: ItemNav[];
}

export type RolPanel = "propietario" | "colaborador";

/** Ajustes: lo que define la información que usan las demás pantallas. Comparten pestañas (`PestanasAjustes`). */
export const AJUSTES: ItemNav[] = [
  { href: "/panel/configuracion", etiqueta: "Mi marca", icono: Settings, soloPropietario: true },
  { href: "/panel/servicios", etiqueta: "Servicios", icono: Wrench, soloPropietario: true },
  { href: "/panel/plantillas", etiqueta: "Plantillas", icono: ListChecks, soloPropietario: true },
  { href: "/panel/equipo", etiqueta: "Equipo", icono: UsersRound, soloPropietario: true },
];

export const NAV_PANEL: GrupoNav[] = [
  {
    titulo: null,
    items: [
      { href: "/panel", etiqueta: "Inicio", icono: LayoutDashboard },
      { href: "/panel/bandeja", etiqueta: "Bandeja", icono: MessagesSquare },
    ],
  },
  {
    titulo: "Trabajo",
    items: [
      { href: "/panel/trabajos", etiqueta: "Trabajos", icono: KanbanSquare },
      { href: "/panel/calendario", etiqueta: "Calendario", icono: CalendarDays },
      { href: "/panel/informes", etiqueta: "Informes", icono: FileBarChart },
      { href: "/panel/documentos", etiqueta: "Documentos", icono: ClipboardList, tambien: ["/panel/fichas", "/panel/briefs", "/panel/actas"] },
    ],
  },
  {
    titulo: "Empresas",
    items: [
      { href: "/panel/clientes", etiqueta: "Empresas", icono: Users, soloPropietario: true },
      { href: "/panel/equipos", etiqueta: "Equipos", icono: Laptop },
    ],
  },
  {
    titulo: "Ventas",
    items: [
      { href: "/panel/leads", etiqueta: "Leads", icono: Inbox, soloPropietario: true },
      { href: "/panel/cotizaciones", etiqueta: "Cotizaciones", icono: FileText, soloPropietario: true },
    ],
  },
  { titulo: "Ajustes", items: AJUSTES },
];

/** Grupos del menú que ve cada rol (sin los que quedan vacíos). */
export function navPara(rol: RolPanel): GrupoNav[] {
  if (rol === "propietario") return NAV_PANEL;
  return NAV_PANEL.map((g) => ({ ...g, items: g.items.filter((i) => !i.soloPropietario) })).filter((g) => g.items.length);
}

/** ¿La ruta actual corresponde a este ítem? Inicio solo en `/panel` exacto. */
export function itemActivo(item: ItemNav, pathname: string): boolean {
  if (item.href === "/panel") return pathname === "/panel";
  return [item.href, ...(item.tambien ?? [])].some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
