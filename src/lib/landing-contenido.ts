/**
 * Contenido fijo de la landing: secciones del menú, pasos de "Cómo trabajo" y proyectos.
 * Solo datos (sin JSX), para que los componentes queden de servidor y se pueda testear.
 */

import type { Idioma } from "@/lib/landing-textos";

export interface Seccion {
  id: string;
  texto: string;
}

/** Secciones en el orden de la página; el menú lateral las recorre y marca la activa. */
export const SECCIONES: Seccion[] = [
  { id: "sobre-mi", texto: "Sobre mí" },
  { id: "servicios", texto: "Servicios" },
  { id: "proyectos", texto: "Proyectos" },
  { id: "como-trabajo", texto: "Cómo trabajo" },
  { id: "contacto", texto: "Contacto" },
];

export interface Paso {
  titulo: string;
  texto: string;
  /** Etiquetas mono bajo el texto (el paso 04 enumera lo que ve la empresa en su espacio). */
  chips?: string[];
}

/** Tres pasos y un cuarto que es el plus: el espacio propio de cada empresa. */
export const PASOS: Paso[] = [
  {
    titulo: "Conversamos",
    texto: "Me cuentas qué necesitas. Pregunto hasta entender el problema, no solo el pedido.",
  },
  {
    titulo: "Acordamos",
    texto: "Precio, alcance y plazo por escrito, antes de empezar.",
  },
  {
    titulo: "Construyo y entrego",
    texto: "Trabajo con avance a la vista y cierro con todo documentado: acta, ficha o informe en PDF.",
  },
  {
    titulo: "Tu espacio",
    texto:
      "No te pido que confíes: entra y míralo. Tu empresa tiene su propio usuario desde el primer día, ve solo lo suyo y siempre al día, sin preguntar “¿cómo vamos?” por chat.",
    chips: ["Proyectos", "Calendario", "Documentos", "Cotizaciones"],
  },
];

export interface Proyecto {
  clave: string;
  titulo: string;
  areas: string[];
  /** La solución entregada, en una o dos frases (no el historial de lo que se quitó o cambió). */
  solucion: string;
  stack: string[];
}

/** Proyectos propios y para clientes. */
export const PROYECTOS: Proyecto[] = [
  {
    clave: "web",
    titulo: "Rediseño y optimización de una web corporativa",
    areas: ["diseño", "desarrollo"],
    solucion:
      "Un rediseño moderno que carga en un instante y está pensado para Google: animaciones ligeras, íconos nítidos y títulos y estructura que posicionan.",
    stack: ["Astro", "CSS", "SEO"],
  },
  {
    clave: "itms",
    titulo: "Sistema ITMS para un área de TI",
    areas: ["desarrollo", "soporte"],
    solucion:
      "Un solo lugar para los accesos del personal: quién tiene qué y desde cuándo, con contraseñas protegidas, mesa de ayuda con tickets e inventario de equipos con fotos.",
    stack: ["Vue 3", "Postgres + RLS", "Funciones en el servidor"],
  },
  {
    clave: "agenda",
    titulo: "Agenda y tareas para equipos de TI",
    areas: ["desarrollo"],
    solucion:
      "Una agenda para planificar la semana del equipo, registrar los imprevistos y medir lo que de verdad se cumple, con órdenes de trabajo aprobadas y métricas para el jefe.",
    stack: ["React 19", "Postgres + RLS", "Multiorganización"],
  },
  {
    clave: "verifica",
    titulo: "Emisión y verificación de documentos con QR",
    areas: ["desarrollo"],
    solucion:
      "Documentos listos para imprimir o firmar, cada uno con su código QR: quien los recibe lo escanea con el celular y comprueba al instante que son auténticos.",
    stack: ["React", "Supabase", "Word (docx)"],
  },
];

// ---------------------------------------------------------------------------------------------
// Inglés. Mismas claves, ids y cantidad que el español (lo comprueba tests/unit/landing-contenido).
// ---------------------------------------------------------------------------------------------

const SECCIONES_EN: Seccion[] = [
  { id: "sobre-mi", texto: "About me" },
  { id: "servicios", texto: "Services" },
  { id: "proyectos", texto: "Projects" },
  { id: "como-trabajo", texto: "How I work" },
  { id: "contacto", texto: "Contact" },
];

const PASOS_EN: Paso[] = [
  {
    titulo: "We talk",
    texto: "You tell me what you need. I keep asking until I understand the problem, not just the request.",
  },
  {
    titulo: "We agree",
    texto: "Price, scope and deadline in writing, before we start.",
  },
  {
    titulo: "I build and deliver",
    texto: "I work with progress in plain sight and close with everything documented: a record, a sheet or a report in PDF.",
  },
  {
    titulo: "Your space",
    texto:
      "I won't ask you to trust me: sign in and see it. Your company gets its own user from day one, sees only its own things and always up to date, with no need to ask “how are we doing?” in a chat.",
    chips: ["Projects", "Calendar", "Documents", "Quotes"],
  },
];

const PROYECTOS_EN: Proyecto[] = [
  {
    clave: "web",
    titulo: "Redesign and optimization of a corporate website",
    areas: ["design", "development"],
    solucion:
      "A modern redesign that loads instantly and is built for Google: lightweight animations, crisp icons, and headings and structure that rank.",
    stack: ["Astro", "CSS", "SEO"],
  },
  {
    clave: "itms",
    titulo: "ITMS system for an IT department",
    areas: ["development", "support"],
    solucion:
      "One place for staff access: who has what and since when, with protected passwords, a help desk with tickets and an equipment inventory with photos.",
    stack: ["Vue 3", "Postgres + RLS", "Server functions"],
  },
  {
    clave: "agenda",
    titulo: "Agenda and tasks for IT teams",
    areas: ["development"],
    solucion:
      "An agenda to plan the team's week, log unexpected events and measure what actually gets done, with approved work orders and metrics for the manager.",
    stack: ["React 19", "Postgres + RLS", "Multi-organization"],
  },
  {
    clave: "verifica",
    titulo: "Issuing and verifying documents with QR codes",
    areas: ["development"],
    solucion:
      "Documents ready to print or sign, each with its own QR code: whoever receives one scans it with their phone and instantly checks it's authentic.",
    stack: ["React", "Supabase", "Word (docx)"],
  },
];

export interface ContenidoLanding {
  secciones: Seccion[];
  pasos: Paso[];
  proyectos: Proyecto[];
}

const CONTENIDO: Record<Idioma, ContenidoLanding> = {
  es: { secciones: SECCIONES, pasos: PASOS, proyectos: PROYECTOS },
  en: { secciones: SECCIONES_EN, pasos: PASOS_EN, proyectos: PROYECTOS_EN },
};

export function contenidoLanding(idioma: Idioma): ContenidoLanding {
  return CONTENIDO[idioma];
}
