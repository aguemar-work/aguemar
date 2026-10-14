import {
  LayoutDashboard,
  Users,
  Laptop,
  Wrench,
  KanbanSquare,
  FileText,
  ClipboardList,
  Inbox,
  MessagesSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface ItemNav {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
}

export const NAV_PANEL: ItemNav[] = [
  { href: "/panel", etiqueta: "Inicio", icono: LayoutDashboard },
  { href: "/panel/clientes", etiqueta: "Empresas", icono: Users },
  { href: "/panel/equipos", etiqueta: "Equipos", icono: Laptop },
  { href: "/panel/servicios", etiqueta: "Servicios", icono: Wrench },
  { href: "/panel/trabajos", etiqueta: "Trabajos", icono: KanbanSquare },
  { href: "/panel/cotizaciones", etiqueta: "Cotizaciones", icono: FileText },
  { href: "/panel/fichas", etiqueta: "Fichas técnicas", icono: ClipboardList },
  { href: "/panel/bandeja", etiqueta: "Bandeja", icono: MessagesSquare },
  { href: "/panel/leads", etiqueta: "Leads", icono: Inbox },
  { href: "/panel/configuracion", etiqueta: "Mi marca", icono: Settings },
];
