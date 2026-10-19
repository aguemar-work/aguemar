/**
 * Textos fijos de la landing en español e inglés. Solo datos (sin JSX), así los componentes de
 * cliente reciben el objeto por props y los tests comprueban que ambos idiomas tengan lo mismo.
 * Los servicios vienen de la base de datos y se muestran como están (en español).
 */
import type { Area } from "@/types/database";

export type Idioma = "es" | "en";

export const IDIOMAS: Idioma[] = ["es", "en"];

export const RUTA_IDIOMA: Record<Idioma, string> = { es: "/", en: "/en" };

const ES = {
  codigo: "es-PE",
  meta: {
    titulo: "aguemar · Diseño, desarrollo y soporte técnico en Perú",
    tituloCorto: "aguemar · Diseño, desarrollo y soporte técnico",
    descripcion:
      "Diseño, desarrollo web y soporte técnico para empresas en Perú. Cotizaciones claras, avance a la vista en tu propio espacio y documentos verificables.",
    locale: "es_PE",
    catalogo: "Servicios",
  },
  selectorIdioma: "Idioma",
  inicioAria: "aguemar, inicio",
  hero: {
    rotulo: "// especialista TI · diseño · desarrollo",
    h1a: "No te pido que confíes.",
    h1b: "Te lo muestro.",
    texto:
      "Especialista TI certificado en ITIL que diseña y programa. Ayudo a empresas a ordenar su tecnología: sistemas que simplifican procesos, interfaces que la gente sí usa e infraestructura que no falla.",
    cta: "Cuéntame tu proyecto",
  },
  menuAria: "Secciones",
  lateral: { correo: "Correo", ingresar: "Ingresar", whatsappMensaje: "Hola, vengo de la web de aguemar y quiero hacer una consulta." },
  sobreMi: {
    rotulo: "sobre mí",
    titulo: "Sobre mí",
    p1: "Soy Alejandro Guevara, llevo 5 años trabajando en áreas de TI, y ahí aprendí que la mayoría de los problemas tecnológicos de una empresa no son técnicos, son de orden: accesos que nadie controla, procesos que dependen de un Excel y de una sola persona, equipos que se revisan recién cuando fallan.",
    p2: "Por eso trabajo en dos frentes. Como especialista TI, sé lo que necesita la operación para no detenerse. Como diseñador y desarrollador frontend, construyo las herramientas que la resuelven, y que la gente sí quiere usar.",
  },
  servicios: {
    rotulo: "servicios",
    titulo: "Lo que hago",
    intro: "Tres oficios que se cruzan todo el tiempo: cómo se ve tu empresa, qué usa cada día y qué la mantiene funcionando.",
    vacio: "Cada proyecto lo armo a medida: cuéntame qué necesitas y te propongo alcance y precio.",
    precioDesde: "Desde",
    precioPor: "por",
    areas: {
      diseno: {
        titulo: "Diseño",
        rotulo: "// diseño",
        otro: "Otro de diseño",
        texto: "Identidad visual, piezas para redes y presentaciones para que tu marca se vea profesional y coherente.",
      },
      desarrollo: {
        titulo: "Desarrollo",
        rotulo: "// desarrollo",
        otro: "Otro de desarrollo",
        texto: "Webs y sistemas a medida: rápidos, seguros y fáciles de administrar por tu equipo.",
      },
      soporte: {
        titulo: "Soporte técnico",
        rotulo: "// soporte",
        otro: "Otro de soporte técnico",
        texto: "Mantenimiento, soporte remoto y redes, con una ficha técnica de cada servicio que puedes verificar.",
      },
    } as Record<Area, { titulo: string; rotulo: string; otro: string; texto: string }>,
  },
  proyectos: {
    rotulo: "proyectos",
    titulo: "Lo que he construido",
    intro: "Proyectos propios y para clientes. Sin nombres, por discreción, pero sí qué problema había y cómo lo resolví.",
  },
  comoTrabajo: {
    rotulo: "cómo trabajo",
    titulo: "Cómo trabajo",
    intro: "Sin sorpresas: sabes qué se hará, cuánto cuesta y en qué va, en cada momento.",
  },
  tuEspacio: {
    rotulo: "tu espacio",
    titulo: "Tu empresa, con su propio espacio",
    intro: "Cada empresa que atiendo entra con su usuario y ve solo lo suyo. Nada de preguntar “¿cómo vamos?” por chat: está ahí, al día. Pruébalo.",
    ejemplo: "Vista de ejemplo, con datos ficticios.",
    yaTrabajas: "¿Ya trabajas conmigo?",
    ingresa: "Ingresa a tu espacio",
  },
  contacto: {
    rotulo: "contacto",
    titulo: "Conversemos",
    intro: "Cuéntame qué necesitas. Te respondo yo, no un bot, con los siguientes pasos.",
    directo: "O directo por",
    o: " o ",
  },
  pie: { hecho: "Hecho con Next.js y Tailwind, en Perú.", privacidad: "Privacidad", ingresar: "Ingresar" },
  demo: {
    aria: "Módulos del espacio",
    ruta: "aguemar.com/w/tu-empresa",
    modulos: { inicio: "Inicio", proyectos: "Proyectos", cotizaciones: "Cotizaciones" },
    proyecto: "Web corporativa",
    proyectoActivo: "Proyecto activo",
    tareas: "6/8 tareas",
    proximaActividad: "Próxima actividad",
    reunion: "Reunión de avance",
    fecha: "jue 22/10 · 10:00",
    respuesta: "Respuesta a tu comentario",
    comentario: "“Listo, ya subí la versión con el logo nuevo.”",
    enCurso: "En curso",
    etapas: ["Descubrimiento", "Diseño", "Desarrollo", "Entrega"],
    aceptada: "Aceptada",
    monto: "S/ 2 450,00",
    adelanto: "Adelanto 50 %",
    montoAdelanto: "S/ 1 225,00",
    saldo: "Saldo",
    montoSaldo: "S/ 1 225,00",
  },
  form: {
    nombre: "Tu nombre",
    empresa: "Empresa",
    opcional: "Opcional",
    whatsapp: "WhatsApp",
    correo: "Correo",
    interes: "¿Qué necesitas?",
    sinDefinir: "Aún no lo sé",
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
  },
};

export type TextosLanding = typeof ES;

const EN: TextosLanding = {
  codigo: "en",
  meta: {
    titulo: "aguemar · Design, development and IT support in Peru",
    tituloCorto: "aguemar · Design, development and IT support",
    descripcion:
      "Design, web development and IT support for companies in Peru. Clear quotes, progress in plain sight in your own space, and verifiable documents.",
    locale: "en_US",
    catalogo: "Services",
  },
  selectorIdioma: "Language",
  inicioAria: "aguemar, home",
  hero: {
    rotulo: "// IT specialist · design · development",
    h1a: "I won't ask you to trust me.",
    h1b: "I'll show you.",
    texto:
      "ITIL-certified IT specialist who designs and codes. I help companies get their technology in order: systems that simplify processes, interfaces people actually use, and infrastructure that doesn't fail.",
    cta: "Tell me about your project",
  },
  menuAria: "Sections",
  lateral: { correo: "Email", ingresar: "Sign in", whatsappMensaje: "Hi, I'm coming from the aguemar website and I'd like to ask about your services." },
  sobreMi: {
    rotulo: "about me",
    titulo: "About me",
    p1: "I'm Alejandro Guevara. I've spent 5 years working in IT, and that's where I learned that most of a company's technology problems aren't technical, they're about order: access nobody controls, processes that depend on one Excel file and one person, equipment that only gets checked once it fails.",
    p2: "That's why I work on two fronts. As an IT specialist, I know what operations need to keep running. As a designer and frontend developer, I build the tools that solve it, and that people actually want to use.",
  },
  servicios: {
    rotulo: "services",
    titulo: "What I do",
    intro: "Three crafts that overlap all the time: how your company looks, what it uses every day, and what keeps it running.",
    vacio: "Every project is tailor-made: tell me what you need and I'll propose scope and price.",
    precioDesde: "From",
    precioPor: "per",
    areas: {
      diseno: {
        titulo: "Design",
        rotulo: "// design",
        otro: "Other design work",
        texto: "Visual identity, social media pieces and presentations so your brand looks professional and consistent.",
      },
      desarrollo: {
        titulo: "Development",
        rotulo: "// development",
        otro: "Other development work",
        texto: "Custom websites and systems: fast, secure and easy for your team to manage.",
      },
      soporte: {
        titulo: "IT support",
        rotulo: "// support",
        otro: "Other IT support",
        texto: "Maintenance, remote support and networks, with a technical sheet for every service that you can verify.",
      },
    },
  },
  proyectos: {
    rotulo: "projects",
    titulo: "What I've built",
    intro: "Personal and client projects. No names, out of discretion, but you'll see what the problem was and how I solved it.",
  },
  comoTrabajo: {
    rotulo: "how I work",
    titulo: "How I work",
    intro: "No surprises: you know what will be done, what it costs and where it stands, at every moment.",
  },
  tuEspacio: {
    rotulo: "your space",
    titulo: "Your company, with its own space",
    intro: "Every company I work with signs in with its own user and sees only its own things. No need to ask “how are we doing?” in a chat: it's right there, up to date. Try it.",
    ejemplo: "Sample view, with made-up data.",
    yaTrabajas: "Already working with me?",
    ingresa: "Sign in to your space",
  },
  contacto: {
    rotulo: "contact",
    titulo: "Let's talk",
    intro: "Tell me what you need. I'll reply myself, not a bot, with the next steps.",
    directo: "Or reach me directly via",
    o: " or ",
  },
  pie: { hecho: "Built with Next.js and Tailwind, in Peru.", privacidad: "Privacy (in Spanish)", ingresar: "Sign in" },
  demo: {
    aria: "Space modules",
    ruta: "aguemar.com/w/your-company",
    modulos: { inicio: "Home", proyectos: "Projects", cotizaciones: "Quotes" },
    proyecto: "Corporate website",
    proyectoActivo: "Active project",
    tareas: "6/8 tasks",
    proximaActividad: "Next activity",
    reunion: "Progress meeting",
    fecha: "Thu 22 Oct · 10:00",
    respuesta: "Reply to your comment",
    comentario: "“Done, I've uploaded the version with the new logo.”",
    enCurso: "In progress",
    etapas: ["Discovery", "Design", "Development", "Delivery"],
    aceptada: "Accepted",
    monto: "S/ 2,450.00",
    adelanto: "50 % advance",
    montoAdelanto: "S/ 1,225.00",
    saldo: "Balance",
    montoSaldo: "S/ 1,225.00",
  },
  form: {
    nombre: "Your name",
    empresa: "Company",
    opcional: "Optional",
    whatsapp: "WhatsApp",
    correo: "Email",
    interes: "What do you need?",
    sinDefinir: "I don't know yet",
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
  },
};

export const TEXTOS: Record<Idioma, TextosLanding> = { es: ES, en: EN };
