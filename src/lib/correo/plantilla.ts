/**
 * Plantilla HTML de los correos de aguemar: tabla simple con estilos en línea
 * (lo que soportan Gmail y Outlook), cabecera oscura con el rótulo mono y un botón mint.
 */

export interface DatosCorreo {
  /** Rótulo mono sobre el título, p. ej. "// informe publicado". */
  rotulo: string;
  titulo: string;
  /** Párrafos de texto plano (se escapan). */
  parrafos: string[];
  /** Cita destacada: el comentario, el mensaje del lead, la respuesta… */
  cita?: string | null;
  boton?: { texto: string; url: string } | null;
  /** Línea final pequeña: por qué recibe este correo. */
  pie: string;
}

/** Pie de los correos a una empresa: por qué lo recibe y cómo dejar de recibirlos. */
export const pieParaEmpresa = (empresa: string) =>
  `Recibes este correo porque ${empresa} trabaja con aguemar. Si prefieres no recibir avisos, responde a este correo y los desactivamos.`;

export function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const conSaltos = (t: string) => escapar(t).replace(/\r?\n/g, "<br>");

const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";
const SANS = "Sora,'Segoe UI',Helvetica,Arial,sans-serif";

export function correoHtml(d: DatosCorreo): string {
  const parrafos = d.parrafos.map((p) => `<p style="margin:0 0 14px;font:15px/1.6 ${SANS};color:#0A0F1A">${conSaltos(p)}</p>`).join("");
  const cita = d.cita
    ? `<div style="margin:4px 0 18px;padding:12px 16px;border-left:3px solid #1CE783;background:#F5F7FA;font:14px/1.6 ${SANS};color:#0A0F1A">${conSaltos(d.cita)}</div>`
    : "";
  const boton = d.boton
    ? `<a href="${escapar(d.boton.url)}" style="display:inline-block;margin:6px 0 4px;padding:12px 22px;border-radius:8px;background:#1CE783;color:#0A0F1A;font:600 15px ${SANS};text-decoration:none">${escapar(d.boton.texto)}</a>`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(d.titulo)}</title></head>
<body style="margin:0;padding:0;background:#F5F7FA">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E2E5EB;border-radius:12px;overflow:hidden">
<tr><td style="background:#0A0F1A;padding:22px 28px">
<div style="font:600 18px ${SANS};color:#FFFFFF">ague<span style="color:#1CE783">mar</span></div>
<div style="margin-top:14px;font:12px ${MONO};color:#1CE783">${escapar(d.rotulo)}</div>
<div style="margin-top:6px;font:600 20px/1.3 ${SANS};color:#FFFFFF">${escapar(d.titulo)}</div>
</td></tr>
<tr><td style="padding:26px 28px 22px">${parrafos}${cita}${boton}</td></tr>
<tr><td style="padding:14px 28px 20px;border-top:1px solid #E2E5EB;font:12px/1.5 ${SANS};color:#4A5263">${escapar(d.pie)}</td></tr>
</table></td></tr></table></body></html>`;
}

/** Versión en texto plano (mejora la entrega y la lectura en clientes simples). */
export function correoTexto(d: DatosCorreo): string {
  return [d.titulo, "", ...d.parrafos, d.cita ? `\n> ${d.cita.replace(/\n/g, "\n> ")}\n` : "", d.boton ? `${d.boton.texto}: ${d.boton.url}` : "", "", "—", d.pie]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}
