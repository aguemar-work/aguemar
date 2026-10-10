import {
  LayoutDashboard,
  Users,
  Laptop,
  Wrench,
  FileText,
  ClipboardList,
  Inbox,
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
  { href: "/panel/clientes", etiqueta: "Clientes", icono: Users },
  { href: "/panel/equipos", etiqueta: "Equipos", icono: Laptop },
  { href: "/panel/servicios", etiqueta: "Servicios", icono: Wrench },
  { href: "/panel/cotizaciones", etiqueta: "Cotizaciones", icono: FileText },
  { href: "/panel/fichas", etiqueta: "Fichas técnicas", icono: ClipboardList },
  { href: "/panel/leads", etiqueta: "Leads", icono: Inbox },
  { href: "/panel/configuracion", etiqueta: "Mi marca", icono: Settings },
];
