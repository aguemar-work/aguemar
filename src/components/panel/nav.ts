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

export type RolPanel = "propietario" | "colaborador";

export const NAV_PANEL: ItemNav[] = [
  { href: "/panel", etiqueta: "Inicio", icono: LayoutDashboard },
  { href: "/panel/clientes", etiqueta: "Empresas", icono: Users, soloPropietario: true },
  { href: "/panel/equipos", etiqueta: "Equipos", icono: Laptop },
  { href: "/panel/servicios", etiqueta: "Servicios", icono: Wrench, soloPropietario: true },
  { href: "/panel/trabajos", etiqueta: "Trabajos", icono: KanbanSquare },
  { href: "/panel/calendario", etiqueta: "Calendario", icono: CalendarDays },
  { href: "/panel/cotizaciones", etiqueta: "Cotizaciones", icono: FileText, soloPropietario: true },
  { href: "/panel/informes", etiqueta: "Informes", icono: FileBarChart },
  { href: "/panel/documentos", etiqueta: "Documentos", icono: ClipboardList, tambien: ["/panel/fichas", "/panel/briefs", "/panel/actas"] },
  { href: "/panel/bandeja", etiqueta: "Bandeja", icono: MessagesSquare },
  { href: "/panel/leads", etiqueta: "Leads", icono: Inbox, soloPropietario: true },
  { href: "/panel/equipo", etiqueta: "Equipo", icono: UsersRound, soloPropietario: true },
  { href: "/panel/configuracion", etiqueta: "Mi marca", icono: Settings, soloPropietario: true },
];

/** Entradas del menú que ve cada rol. */
export function navPara(rol: RolPanel): ItemNav[] {
  return rol === "propietario" ? NAV_PANEL : NAV_PANEL.filter((i) => !i.soloPropietario);
}
