import { envPublico } from "@/lib/env";
import type { ClaveModulo } from "@/lib/modulos";

/** Enlace público de una invitación (de un solo uso, vence en 7 días). */
export function enlaceInvitacion(token: string): string {
  return `${envPublico.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/invitacion/${token}`;
}

/** Formato de los tokens de generar_token(): base64url de 32 bytes. Se valida antes de ir a la base. */
export const TOKEN_INVITACION = /^[A-Za-z0-9_-]{40,64}$/;

/** Enlace de WhatsApp con el mensaje de la invitación listo para enviar. */
export function whatsappInvitacion(enlace: string, tipo: "empresa" | "colaborador"): string {
  const texto =
    tipo === "empresa"
      ? `Hola, te comparto el acceso a tu espacio en aguemar. Crea tu contraseña aquí (vence en 7 días): ${enlace}`
      : `Hola, te sumo al equipo de aguemar. Crea tu contraseña aquí (vence en 7 días): ${enlace}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/** Perfiles de acceso: módulos que se activan de un clic según el tipo de relación con la empresa. */
export const PERFILES_ACCESO: { clave: string; etiqueta: string; descripcion: string; modulos: ClaveModulo[] }[] = [
  {
    clave: "soporte",
    etiqueta: "Soporte",
    descripcion: "Cotización, fichas técnicas, equipos, cobros y pedidos de soporte.",
    modulos: ["documentos", "cotizaciones", "equipos", "solicitudes"],
  },
  {
    clave: "proyecto",
    etiqueta: "Proyecto",
    descripcion: "Avance, calendario, informes, documentos y solicitudes.",
    modulos: ["proyectos", "calendario", "informes", "documentos", "solicitudes"],
  },
  {
    clave: "completo",
    etiqueta: "Completo",
    descripcion: "Todos los módulos.",
    modulos: ["proyectos", "calendario", "informes", "documentos", "cotizaciones", "equipos", "solicitudes"],
  },
];

/** Perfil que coincide exactamente con los módulos activos, si alguno. */
export function perfilDeModulos(modulos: readonly string[]): string | null {
  const activos = [...modulos].sort().join(",");
  return PERFILES_ACCESO.find((p) => [...p.modulos].sort().join(",") === activos)?.clave ?? null;
}
