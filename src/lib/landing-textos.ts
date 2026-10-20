/**
 * Textos fijos de la landing en español e inglés. Solo datos (sin JSX), así los componentes de
 * cliente reciben el objeto por props y los tests comprueban que ambos idiomas tengan lo mismo.
 * Los servicios del catálogo (base de datos) solo alimentan el JSON-LD; en la página se presentan los
 * dos oficios de `servicios.bloques`.
 */

export type Idioma = "es" | "en";

export const IDIOMAS: Idioma[] = ["es", "en"];

export const RUTA_IDIOMA: Record<Idioma, string> = { es: "/", en: "/en" };

const ES = {
  codigo: "es-PE",
  meta: {
    titulo: "Alejandro Guevara M. · Especialista TI y Desarrollador Frontend | aguemar",
    tituloCorto: "aguemar · Especialista TI y Desarrollador Frontend",
    descripcion:
      "Alejandro Guevara M., especialista TI y desarrollador frontend en Perú. Simplifico procesos, ideas e interfaces: webs, sistemas y soporte técnico para empresas.",
    locale: "es_PE",
    catalogo: "Servicios",
  },
  selectorIdioma: "Idioma",
  inicioAria: "aguemar, inicio",
  hero: {
    rotulo: "// hola, soy",
    cargoA: "Especialista TI y",
    cargoB: "Desarrollador Frontend.",
    texto: "Simplifico procesos, diseño interfaces y construyo la arquitectura que los sostiene.",
    cta: "Cuéntame tu proyecto",
  },
  menuAria: "Secciones",
  lateral: { correo: "Correo", ingresar: "Ingresar", whatsappMensaje: "Hola, vengo de la web de aguemar y quiero hacer una consulta." },
  sobreMi: {
    rotulo: "sobre mí",
    titulo: "Sobre mí",
    p1: "Llevo más de 5 años trabajando en TI y desarrollo frontend. Aprendí que la mayoría de los problemas de una empresa no son técnicos, son de orden.",
    p2: "Como especialista TI, sé lo que necesita la operación para no detenerse. Como desarrollador frontend, construyo las herramientas que lo resuelven.",
  },
  servicios: {
    rotulo: "servicios",
    titulo: "Lo que hago",
    intro: "Dos oficios que se cruzan todo el tiempo: lo que tu empresa usa cada día y lo que la mantiene funcionando.",
    bloques: [
      {
        rotulo: "// frontend",
        titulo: "Desarrollador Frontend / Diseñador",
        texto:
          "Diseño y construyo la cara de tu empresa: webs, interfaces y sistemas que se ven bien, cargan rápido y se entienden a la primera. Pienso en quien los va a usar antes de escribir una línea de código.",
        chips: ["Webs corporativas", "Interfaces y sistemas web", "Identidad y piezas visuales", "SEO y velocidad"],
      },
      {
        rotulo: "// ti",
        titulo: "Especialista TI",
        texto:
          "Me encargo de que tu operación no se detenga: equipos, redes, accesos y soporte, con orden y con respaldo documentado. Prevengo los problemas en lugar de apagar incendios.",
        chips: ["Soporte y mantenimiento", "Redes y accesos", "Inventario y fichas técnicas", "Gestión ITIL"],
      },
    ],
  },
  proyectos: {
    rotulo: "proyectos",
    titulo: "Lo que he construido",
    intro: "Soluciones que construí, contadas por lo que resuelven.",
    medida: "hecho a medida",
  },
  comoTrabajo: {
    rotulo: "cómo trabajo",
    titulo: "Cómo trabajo",
    intro: "Sin sorpresas, de principio a fin.",
    yaTrabajas: "¿Ya trabajas conmigo?",
    ingresa: "Ingresa a tu espacio",
  },
  contacto: {
    rotulo: "contacto",
    titulo: "Conversemos",
    intro: "Cuéntame qué necesitas. Te respondo yo, no un bot, con los siguientes pasos.",
    correo: "correo",
    oMensaje: "O déjame un mensaje aquí y te escribo yo.",
  },
  pie: { copyright: "Todos los zurdos reservados.", privacidad: "Privacidad" },
  form: {
    nombre: "Tu nombre",
    whatsapp: "WhatsApp",
    correo: "Correo",
    unoDeLosDos: "Con uno de los dos basta.",
    mensaje: "Cuéntame",
    mensajePlaceholder: "Qué necesitas, para cuándo y cualquier detalle que ayude.",
    sitio: "Sitio web",
    datos: "Uso tus datos solo para responderte.",
    comoLosTrato: "Cómo los trato",
    enviar: "Enviar mensaje",
    graciasTitulo: "¡Gracias! Recibí tu mensaje.",
    graciasTexto: "Te respondo pronto por WhatsApp o correo.",
    escribirWhatsApp: "Escribir por WhatsApp",
    otroMensaje: "Enviar otro mensaje",
    sinCanalTitulo: "Tu mensaje no se pudo enviar desde aquí.",
    sinCanalTexto: "Te lo dejé listo en WhatsApp: solo tienes que enviarlo.",
    sinCanalSinWhatsApp: "Escríbeme al correo de arriba, por favor.",
    enviarPorWhatsApp: "Enviar por WhatsApp",
  },
};

export type TextosLanding = typeof ES;

const EN: TextosLanding = {
  codigo: "en",
  meta: {
    titulo: "Alejandro Guevara M. · IT Specialist and Frontend Developer | aguemar",
    tituloCorto: "aguemar · IT Specialist and Frontend Developer",
    descripcion:
      "Alejandro Guevara M., IT specialist and frontend developer in Peru. I simplify processes, ideas and interfaces: websites, systems and IT support for companies.",
    locale: "en_US",
    catalogo: "Services",
  },
  selectorIdioma: "Language",
  inicioAria: "aguemar, home",
  hero: {
    rotulo: "// hi, I'm",
    cargoA: "IT Specialist and",
    cargoB: "Frontend Developer.",
    texto: "I simplify processes, design interfaces and build the architecture that holds them together.",
    cta: "Tell me about your project",
  },
  menuAria: "Sections",
  lateral: { correo: "Email", ingresar: "Sign in", whatsappMensaje: "Hi, I'm coming from the aguemar website and I'd like to ask about your services." },
  sobreMi: {
    rotulo: "about me",
    titulo: "About me",
    p1: "I've spent more than 5 years working in IT and frontend development. I learned that most of a company's problems aren't technical, they're about order.",
    p2: "As an IT specialist, I know what operations need to keep running. As a frontend developer, I build the tools that solve it.",
  },
  servicios: {
    rotulo: "services",
    titulo: "What I do",
    intro: "Two crafts that overlap all the time: what your company uses every day and what keeps it running.",
    bloques: [
      {
        rotulo: "// frontend",
        titulo: "Frontend Developer / Designer",
        texto:
          "I design and build your company's face: websites, interfaces and systems that look good, load fast and make sense at first glance. I think about who will use them before writing a single line of code.",
        chips: ["Corporate websites", "Web interfaces and systems", "Identity and visual pieces", "SEO and speed"],
      },
      {
        rotulo: "// it",
        titulo: "IT Specialist",
        texto:
          "I make sure your operation doesn't stop: equipment, networks, access and support, with order and documented backing. I prevent problems instead of putting out fires.",
        chips: ["Support and maintenance", "Networks and access", "Inventory and technical sheets", "ITIL practices"],
      },
    ],
  },
  proyectos: {
    rotulo: "projects",
    titulo: "What I've built",
    intro: "Solutions I built, told by what they solve.",
    medida: "custom-made",
  },
  comoTrabajo: {
    rotulo: "how I work",
    titulo: "How I work",
    intro: "No surprises, from start to finish.",
    yaTrabajas: "Already working with me?",
    ingresa: "Sign in to your space",
  },
  contacto: {
    rotulo: "contact",
    titulo: "Let's talk",
    intro: "Tell me what you need. I'll reply myself, not a bot, with the next steps.",
    correo: "email",
    oMensaje: "Or leave me a message here and I'll get back to you.",
  },
  pie: { copyright: "All lefts reserved.", privacidad: "Privacy (in Spanish)" },
  form: {
    nombre: "Your name",
    whatsapp: "WhatsApp",
    correo: "Email",
    unoDeLosDos: "One of the two is enough.",
    mensaje: "Tell me more",
    mensajePlaceholder: "What you need, by when, and any detail that helps.",
    sitio: "Website",
    datos: "I use your data only to reply to you.",
    comoLosTrato: "How I handle it (in Spanish)",
    enviar: "Send message",
    graciasTitulo: "Thanks! I got your message.",
    graciasTexto: "I'll reply soon by WhatsApp or email.",
    escribirWhatsApp: "Message me on WhatsApp",
    otroMensaje: "Send another message",
    sinCanalTitulo: "Your message couldn't be sent from here.",
    sinCanalTexto: "It's ready on WhatsApp: you just need to send it.",
    sinCanalSinWhatsApp: "Please email me at the address above.",
    enviarPorWhatsApp: "Send on WhatsApp",
  },
};

export const TEXTOS: Record<Idioma, TextosLanding> = { es: ES, en: EN };
