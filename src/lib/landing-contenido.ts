/**
 * Contenido fijo de la landing: secciones del menú, pasos de "Cómo trabajo" y proyectos.
 * Solo datos (sin JSX), para que los componentes queden de servidor y se pueda testear.
 */

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
  { id: "tu-espacio", texto: "Tu espacio" },
  { id: "contacto", texto: "Contacto" },
];

export interface Paso {
  titulo: string;
  texto: string;
  artefacto: string;
}

export const PASOS: Paso[] = [
  {
    titulo: "Conversamos",
    texto: "Me cuentas qué necesitas por WhatsApp, el formulario o una reunión. Pregunto hasta entender el problema, no solo el pedido.",
    artefacto: "// brief",
  },
  {
    titulo: "Cotización clara",
    texto: "Precio, alcance y plazo por escrito, antes de empezar. La aceptas en línea con tu nombre y DNI.",
    artefacto: "COT-AAAA-NNN · PDF",
  },
  {
    titulo: "Avance a la vista",
    texto: "Tu empresa tiene su espacio con el proyecto, el calendario y los informes. Entras cuando quieras, sin pedirme capturas.",
    artefacto: "/w/tu-empresa",
  },
  {
    titulo: "Entrega con respaldo",
    texto: "Cierro con un acta de entrega o una ficha técnica en PDF, con un QR que abre el documento original.",
    artefacto: "AE-AAAA-NNN · QR",
  },
];

export interface Proyecto {
  clave: string;
  titulo: string;
  areas: string[];
  reto: string;
  hecho: string[];
  stack: string[];
}

/** Proyectos propios y para clientes, contados de forma general (sin nombres de clientes). */
export const PROYECTOS: Proyecto[] = [
  {
    clave: "web",
    titulo: "Rediseño y optimización de una web corporativa",
    areas: ["diseño", "desarrollo"],
    reto: "Una web que tardaba en mostrarse: librerías externas, íconos y animaciones que bloqueaban la carga.",
    hecho: [
      "Quité tres recursos externos que frenaban la página antes de pintarse.",
      "Cambié las animaciones a CSS nativo: de 14 KB de JavaScript a menos de 1 KB.",
      "Íconos en SVG, imagen principal prioritaria y títulos pensados para Google.",
    ],
    stack: ["Astro", "CSS", "SEO"],
  },
  {
    clave: "itms",
    titulo: "Sistema ITMS para un área de TI",
    areas: ["desarrollo", "soporte"],
    reto: "Los accesos de cada trabajador (correo, VPN, ERP…) estaban repartidos y nadie sabía quién tuvo qué, ni desde cuándo.",
    hecho: [
      "Historial de asignaciones: quién tuvo cada acceso, desde cuándo y si la contraseña se cambió después.",
      "Contraseñas cifradas en el servidor y entregas por enlace de un solo uso.",
      "Mesa de ayuda propia con tickets y encuestas, más el inventario de equipos con fotos.",
    ],
    stack: ["Vue 3", "Postgres + RLS", "Funciones en el servidor"],
  },
  {
    clave: "agenda",
    titulo: "Agenda y tareas para equipos de TI",
    areas: ["desarrollo"],
    reto: "Planificar la semana de un equipo, registrar los imprevistos del día y medir lo que de verdad se cumple.",
    hecho: [
      "“Mi semana”: grilla de lunes a sábado con tareas, incidencias y bitácora.",
      "Órdenes de trabajo con aprobación: borrador, pendiente, aprobada y completada.",
      "Objetivos con avance, métricas para el jefe y varias organizaciones aisladas en la base de datos.",
    ],
    stack: ["React 19", "Postgres + RLS", "Multiorganización"],
  },
  {
    clave: "verifica",
    titulo: "Emisión y verificación de documentos con QR",
    areas: ["desarrollo"],
    reto: "Documentos que se podían copiar o alterar sin que quien los recibía pudiera comprobarlo.",
    hecho: [
      "El sistema emite el documento en Word, listo para imprimir o firmar.",
      "Cada documento lleva un código QR propio.",
      "Quien lo recibe lo escanea con el celular y ve si es auténtico.",
    ],
    stack: ["React", "Supabase", "Word (docx)"],
  },
];
