/**
 * Avisos por correo. Cada función programa el envío con `after()`: la acción responde
 * de inmediato y el correo sale después, sin sumar espera al usuario. Si algo falla
 * (sin API key, sin correo de destino), el aviso se omite en silencio.
 */
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { conSesion } from "@/lib/datos/base";
import { clienteAnonimo } from "@/lib/datos/landing";
import { envPublico, envServidor } from "@/lib/env";
import { NOMBRE_DOCUMENTO } from "@/lib/documentos";
import { textoPeriodo } from "@/lib/informe";
import { moduloActivo, type ClaveModulo } from "@/lib/modulos";
import type { EntidadComentario } from "@/types/database";
import { enviarCorreo, type Envio } from "./enviar";
import { pieParaEmpresa } from "./plantilla";
import { armarCopiaAceptacion } from "./copia-aceptacion";
import { etiquetaVersion } from "@/lib/cotizacion";
import { formatearFechaHora } from "@/lib/format";
import type { WsCotizacion } from "@/lib/datos/workspace";

type Db = Awaited<ReturnType<typeof conSesion>>["db"];
/** Un valor ya conocido o una consulta en curso: se espera recién dentro de `after`. */
type Diferido<T> = T | Promise<T>;

const url = (ruta: string) => `${envPublico.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}${ruta}`;
const PIE_PROPIO = "Aviso automático de aguemar Studio.";

/** true si hay API key de Resend: sin ella no vale la pena ni consultar datos para el aviso. */
export const avisosActivos = () => Boolean(envServidor().RESEND_API_KEY);

/** Programa el envío para después de responder. Fuera de una petición (tests), envía en el acto. */
function despues(tarea: () => Promise<unknown>) {
  if (!envServidor().RESEND_API_KEY) return;
  const segura = () =>
    tarea().catch((e) => {
      console.error("[correo] Aviso fallido:", e);
      Sentry.captureException(e);
    });
  try {
    after(segura);
  } catch {
    void segura();
  }
}

/** Tu correo para avisos: AVISOS_PARA o, si no está, el correo de Mi marca. */
export async function correoPropietario(): Promise<string | null> {
  const fijo = envServidor().AVISOS_PARA;
  if (fijo) return fijo;
  const { data } = (await clienteAnonimo()?.database.rpc("landing_datos")) ?? { data: null };
  return (data as { marca?: { correo?: string | null } } | null)?.marca?.correo ?? null;
}

async function alPropietario(e: Omit<Envio, "para" | "pie">) {
  const para = await correoPropietario();
  if (para) await enviarCorreo({ ...e, para, pie: PIE_PROPIO });
}

// ---------------------------------------------------------------------------
// Para ti
// ---------------------------------------------------------------------------
export function avisarLead(l: { nombre: string; telefono: string | null; correo: string | null; interes: string | null; mensaje: string }) {
  despues(() =>
    alPropietario({
      asunto: `Nuevo mensaje desde la web: ${l.nombre}`,
      rotulo: "// nuevo lead",
      titulo: `${l.nombre} te escribió desde la web`,
      parrafos: [[l.interes ? `Interés: ${l.interes}` : null, l.telefono ? `WhatsApp: ${l.telefono}` : null, l.correo ? `Correo: ${l.correo}` : null].filter(Boolean).join("\n")],
      cita: l.mensaje,
      boton: { texto: "Ver en Leads", url: url("/panel/leads") },
      responderA: l.correo,
    }),
  );
}

const RUTA_PANEL: Partial<Record<EntidadComentario, (id: string) => string>> = {
  trabajo: (id) => `/panel/trabajos/${id}#comentarios`,
  actividad: (id) => `/panel/calendario/${id}`,
  informe: (id) => `/panel/informes/${id}#comentarios`,
  cotizacion: (id) => `/panel/cotizaciones/${id}#comentarios`,
};

export function avisarComentarioEmpresa(c: { empresa: Diferido<string | null>; entidad: EntidadComentario; entidadId: string; titulo: Diferido<string | null>; texto: string }) {
  despues(async () => {
    const [empresa, titulo] = [(await c.empresa) ?? "Una empresa", await c.titulo];
    await alPropietario({
      asunto: `${empresa} comentó${titulo ? `: ${titulo}` : ""}`,
      rotulo: "// comentario",
      titulo: `${empresa} te dejó un comentario`,
      parrafos: titulo ? [`En «${titulo}».`] : [],
      cita: c.texto,
      boton: { texto: "Responder", url: url(RUTA_PANEL[c.entidad]?.(c.entidadId) ?? "/panel/bandeja") },
    });
  });
}

export function avisarSolicitud(s: { empresa: Diferido<string | null>; titulo: string; descripcion?: string | null; prioridad: string; fecha_deseada?: string | null }) {
  despues(async () => {
    const empresa = (await s.empresa) ?? "Una empresa";
    await alPropietario({
      asunto: `Nueva solicitud de ${empresa}: ${s.titulo}`,
      rotulo: "// solicitud",
      titulo: s.titulo,
      parrafos: [
        `${empresa} pidió un trabajo${s.prioridad === "alta" ? " (urgente)" : ""}${s.fecha_deseada ? `, para el ${s.fecha_deseada.split("-").reverse().join("/")}` : ""}.`,
        "Desde la Bandeja puedes responderla o convertirla en trabajo o cotización.",
      ],
      cita: s.descripcion || null,
      boton: { texto: "Abrir la Bandeja", url: url("/panel/bandeja") },
    });
  });
}

export function avisarAceptacion(a: { tipo: "cotizacion" | "acta"; numero: string | null; nombre: string; empresa?: Diferido<string | null>; via: "workspace" | "enlace" }) {
  const doc = a.tipo === "cotizacion" ? "cotización" : "acta de entrega";
  despues(async () => {
    const empresa = await a.empresa;
    await alPropietario({
      asunto: `${a.tipo === "cotizacion" ? "Cotización aceptada" : "Acta aceptada"}: ${a.numero ?? ""}`.trim(),
      rotulo: a.tipo === "cotizacion" ? "// cotización aceptada" : "// entrega conforme",
      titulo: `${empresa ?? a.nombre} aceptó ${a.numero ?? `la ${doc}`}`,
      parrafos: [
        `${a.nombre} aceptó la ${doc} ${a.via === "workspace" ? "desde su espacio" : "desde el enlace público"}.`,
        a.tipo === "cotizacion" ? "El trabajo ya se creó en curso, vinculado a la cotización." : "El trabajo pasó a entregado.",
      ],
      boton: {
        texto: a.tipo === "cotizacion" ? "Ver la cotización" : "Ver el acta",
        url: url(a.tipo === "cotizacion" ? `/panel/cotizaciones?q=${encodeURIComponent(a.numero ?? "")}` : `/panel/documentos?tipo=acta&q=${encodeURIComponent(a.numero ?? "")}`),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Para la empresa (se llaman desde acciones del panel, con tu sesión)
// ---------------------------------------------------------------------------
interface Destino {
  correo: string;
  nombre: string;
  contacto: string | null;
  slug: string | null;
  modulos: string[];
  conAcceso: boolean;
}

/**
 * Correo de la empresa: el de contacto o, si no tiene, el de su usuario. Null si desactivó los avisos.
 * contacto_aviso_empresa responde al propietario y al colaborador asignado (el colaborador no lee clientes).
 */
async function destinoEmpresa(db: Db, clienteId: string): Promise<Destino | null> {
  const { data } = await db.rpc("contacto_aviso_empresa", { p_cliente: clienteId });
  const c = data as {
    nombre: string;
    contacto: string | null;
    correo: string | null;
    slug: string | null;
    modulos: string[] | null;
    activa: boolean;
    avisos_correo: boolean;
    correo_usuario: string | null;
  } | null;
  if (!c || !c.avisos_correo || c.activa === false) return null;
  const correo = c.correo || c.correo_usuario;
  if (!correo) return null;
  return { correo, nombre: c.nombre, contacto: c.contacto, slug: c.slug, modulos: c.modulos ?? [], conAcceso: Boolean(c.correo_usuario && c.slug) };
}

/** A qué correo le llegaría un aviso a la empresa (null si no hay Resend, correo, o desactivó los avisos). */
export async function correoAvisoEmpresa(db: Db, clienteId: string): Promise<string | null> {
  if (!avisosActivos()) return null;
  return (await destinoEmpresa(db, clienteId))?.correo ?? null;
}

const saludo = (d: Destino) => (d.contacto ? `Hola ${d.contacto.split(" ")[0]},` : "Hola,");
const pieEmpresa = (d: Destino) => pieParaEmpresa(d.nombre);

async function aLaEmpresa(db: Db, clienteId: string, armar: (d: Destino) => Omit<Envio, "para" | "pie" | "responderA"> | null) {
  const d = await destinoEmpresa(db, clienteId);
  if (!d) return;
  const e = armar(d);
  if (!e) return;
  await enviarCorreo({ ...e, para: d.correo, pie: pieEmpresa(d), responderA: await correoPropietario() });
}

type TipoDoc = "ficha" | "brief" | "acta" | "informe" | "cotizacion";

const DOC: Record<TipoDoc, { tabla: string; titulo: string; modulo: ClaveModulo; ruta: (id: string) => string; femenino: boolean }> = {
  ficha: { tabla: "fichas", titulo: "titular", modulo: "documentos", ruta: (id) => `documentos/${id}`, femenino: true },
  brief: { tabla: "briefs", titulo: "titulo", modulo: "documentos", ruta: (id) => `documentos/brief/${id}`, femenino: false },
  acta: { tabla: "actas_entrega", titulo: "titulo", modulo: "documentos", ruta: (id) => `documentos/acta/${id}`, femenino: true },
  informe: { tabla: "informes", titulo: "titulo", modulo: "informes", ruta: (id) => `informes/${id}`, femenino: false },
  cotizacion: { tabla: "cotizaciones", titulo: "asunto", modulo: "cotizaciones", ruta: (id) => `cotizaciones/${id}`, femenino: true },
};

/** Documento publicado (o cotización enviada): enlace a su espacio si tiene el módulo; si no, al enlace público. */
export async function avisarDocumentoEmpresa(tipo: TipoDoc, id: string) {
  if (!envServidor().RESEND_API_KEY) return;
  const { db } = await conSesion();
  despues(async () => {
    const cfg = DOC[tipo];
    const extra = tipo === "informe" ? ", periodo_inicio, periodo_fin" : "";
    const { data } = await db.from(cfg.tabla).select(`numero, cliente_id, ${cfg.titulo}${extra}`).eq("id", id).maybeSingle();
    const doc = data as Record<string, string | null> | null;
    if (!doc?.cliente_id) return;
    const enlace = await db.from("enlaces_publicos").select("token, revocado").eq("tipo", tipo).eq("documento_id", id).maybeSingle();
    const token = (enlace.data as { token: string; revocado: boolean } | null)?.revocado === false ? (enlace.data as { token: string }).token : null;
    const nombre = NOMBRE_DOCUMENTO[tipo];
    const titulo = doc[cfg.titulo] ?? nombre;
    await aLaEmpresa(db, doc.cliente_id, (d) => {
      const enEspacio = d.conAcceso && moduloActivo(d.modulos, cfg.modulo);
      const destino = enEspacio ? url(`/w/${d.slug}/${cfg.ruta(id)}`) : token ? url(`/d/${token}`) : null;
      if (!destino) return null;
      const accion =
        tipo === "cotizacion"
          ? "Revísala y, si estás de acuerdo, acéptala en línea con tu nombre y DNI."
          : tipo === "acta"
            ? "Revisa los entregables y, si todo está conforme, acéptala con tu nombre y DNI."
            : tipo === "informe"
              ? `Resume lo avanzado en ${textoPeriodo(doc.periodo_inicio!, doc.periodo_fin!).toLowerCase()}. Si tienes comentarios, puedes dejarlos ahí mismo.`
              : "Ahí puedes verlo en línea y descargar el PDF.";
      return {
        asunto: `${tipo === "cotizacion" ? "Te enviamos la cotización" : `${cfg.femenino ? "Nueva" : "Nuevo"} ${nombre.toLowerCase()}`} ${doc.numero ?? ""}: ${titulo}`.replace(/\s+:/, ":"),
        rotulo: `// ${nombre.toLowerCase()}`,
        titulo,
        parrafos: [saludo(d), `Te compartimos ${cfg.femenino ? "la" : "el"} ${nombre.toLowerCase()} ${doc.numero ?? ""}.`.replace(/\s+\./, "."), accion],
        boton: { texto: enEspacio ? "Abrir en tu espacio" : "Ver el documento", url: destino },
      };
    });
  });
}

/**
 * Constancia a la empresa cuando se registra la aceptación desde el panel (D5). Las aceptaciones que
 * hace la propia empresa o alguien con el enlace no la envían: esas sesiones no pueden leer el correo
 * de la empresa, y quien aceptó ya tiene la pantalla de confirmación.
 */
export async function avisarCopiaAceptacion(id: string) {
  if (!envServidor().RESEND_API_KEY) return;
  const { db } = await conSesion();
  despues(async () => {
    const [doc, fila, enlace] = await Promise.all([
      db.rpc("cotizacion_panel", { p_id: id }),
      db.from("cotizaciones").select("cliente_id").eq("id", id).maybeSingle(),
      db.rpc("obtener_enlace", { p_tipo: "cotizacion", p_id: id, p_renovar: false }),
    ]);
    const c = doc.data as WsCotizacion | null;
    const clienteId = (fila.data as { cliente_id: string } | null)?.cliente_id;
    const token = enlace.error ? null : (enlace.data as string);
    if (!c?.aceptacion || !clienteId) return;
    await aLaEmpresa(db, clienteId, (d) => {
      const enEspacio = d.conAcceso && moduloActivo(d.modulos, "cotizaciones");
      const destino = enEspacio ? url(`/w/${d.slug}/cotizaciones/${id}`) : token ? url(`/d/${token}`) : null;
      if (!destino) return null;
      return armarCopiaAceptacion({
        saludo: saludo(d),
        numero: c.numero,
        asunto: c.asunto,
        nombre: c.aceptacion!.nombre,
        por: c.aceptacion!.por,
        fecha: formatearFechaHora(c.aceptacion!.aceptado_en),
        version: etiquetaVersion(c.version, c.huella),
        url: destino,
      });
    });
  });
}

const RUTA_ESPACIO: Partial<Record<EntidadComentario, { modulo: ClaveModulo; ruta: (id: string) => string; tabla: string; titulo?: string }>> = {
  trabajo: { modulo: "proyectos", ruta: (id) => `proyectos/${id}`, tabla: "trabajos" },
  // (si responde un colaborador, el título sale de trabajos_equipo: ver avisarRespuestaEmpresa)
  actividad: { modulo: "calendario", ruta: (id) => `calendario/${id}`, tabla: "actividades" },
  informe: { modulo: "informes", ruta: (id) => `informes/${id}`, tabla: "informes" },
  cotizacion: { modulo: "cotizaciones", ruta: (id) => `cotizaciones/${id}`, tabla: "cotizaciones", titulo: "asunto" },
};

/** Respondiste un comentario de la empresa. */
export async function avisarRespuestaEmpresa(entidad: EntidadComentario, entidadId: string, clienteId: string, texto: string) {
  if (!envServidor().RESEND_API_KEY) return;
  const cfg = RUTA_ESPACIO[entidad];
  if (!cfg) return;
  const { db } = await conSesion();
  despues(async () => {
    const campo = cfg.titulo ?? "titulo";
    let { data } = await db.from(cfg.tabla).select(campo).eq("id", entidadId).maybeSingle();
    if (!data && cfg.tabla === "trabajos") ({ data } = await db.from("trabajos_equipo").select("titulo").eq("id", entidadId).maybeSingle());
    const titulo = (data as Record<string, string> | null)?.[campo] ?? (entidad === "cotizacion" ? "tu cotización" : "tu proyecto");
    await aLaEmpresa(db, clienteId, (d) =>
      d.conAcceso && moduloActivo(d.modulos, cfg.modulo)
        ? {
            asunto: `Te respondimos: ${titulo}`,
            rotulo: "// respuesta",
            titulo: `Nuevo mensaje en «${titulo}»`,
            parrafos: [saludo(d)],
            cita: texto,
            boton: { texto: "Ver la conversación", url: url(`/w/${d.slug}/${cfg.ruta(entidadId)}`) },
          }
        : null,
    );
  });
}

const ESTADO_SOLICITUD: Record<string, string> = { en_revision: "está en revisión", aceptada: "fue aceptada", rechazada: "no procede por ahora" };

/** Respondiste una solicitud de la empresa. */
export async function avisarSolicitudRespondida(solicitudId: string) {
  if (!envServidor().RESEND_API_KEY) return;
  const { db } = await conSesion();
  despues(async () => {
    const { data } = await db.from("solicitudes").select("cliente_id, titulo, estado, respuesta").eq("id", solicitudId).maybeSingle();
    const s = data as { cliente_id: string; titulo: string; estado: string; respuesta: string | null } | null;
    if (!s) return;
    await aLaEmpresa(db, s.cliente_id, (d) =>
      d.conAcceso && moduloActivo(d.modulos, "solicitudes")
        ? {
            asunto: `Tu solicitud ${ESTADO_SOLICITUD[s.estado] ?? "tiene novedades"}: ${s.titulo}`,
            rotulo: "// solicitud",
            titulo: s.titulo,
            parrafos: [saludo(d), `Tu pedido ${ESTADO_SOLICITUD[s.estado] ?? "tiene novedades"}.`],
            cita: s.respuesta,
            boton: { texto: "Ver mis solicitudes", url: url(`/w/${d.slug}/solicitudes`) },
          }
        : null,
    );
  });
}

// ---------------------------------------------------------------------------
// Invitaciones de acceso
// ---------------------------------------------------------------------------
/**
 * Invitación para entrar a su espacio (empresa) o al panel (colaborador). El enlace
 * es de un solo uso y vence en 7 días; quien lo recibe fija su contraseña.
 * Se llama desde una acción del propietario; si no hay Resend, no se envía nada
 * (el propietario igual tiene el enlace para copiarlo).
 */
export function avisarInvitacion(i: { correo: string; enlace: string; tipo: "empresa" | "colaborador"; empresa?: string | null; nombre?: string | null }) {
  despues(async () => {
    const estudio = "aguemar";
    const saludoInv = i.nombre ? `Hola ${i.nombre.split(" ")[0]},` : "Hola,";
    const esEmpresa = i.tipo === "empresa";
    await enviarCorreo({
      para: i.correo,
      asunto: esEmpresa ? `Tu espacio en ${estudio}${i.empresa ? ` para ${i.empresa}` : ""}` : `Te invitaron al equipo de ${estudio}`,
      rotulo: esEmpresa ? "// tu espacio" : "// equipo",
      titulo: esEmpresa ? "Ya tienes un espacio para seguir tus proyectos" : "Te sumamos al equipo",
      parrafos: [
        saludoInv,
        esEmpresa
          ? `Desde tu espacio${i.empresa ? ` de ${i.empresa}` : ""} vas a ver el avance, los documentos y las cotizaciones, y podrás dejarnos comentarios.`
          : "Vas a ver y trabajar los proyectos de las empresas que te asignamos: tareas, actividades, fichas e informes.",
        "Abre el enlace, crea tu contraseña y listo. Vence en 7 días y sirve una sola vez.",
      ],
      boton: { texto: esEmpresa ? "Crear mi acceso" : "Unirme al equipo", url: i.enlace },
      pie: "Si no esperabas este correo, ignóralo: sin abrir el enlace no se crea ninguna cuenta.",
      responderA: await correoPropietario(),
    });
  });
}
