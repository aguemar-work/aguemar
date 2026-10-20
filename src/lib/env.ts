import { z } from "zod";

/**
 * Variables de entorno públicas. InsForge es opcional en tiempo de build para
 * que la app compile y muestre un aviso cuando aún no está configurado.
 */
const publicoSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: z.string().url().optional(),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_WHATSAPP: z.string().optional(),
});

function vacioAUndefined(valor: string | undefined) {
  return valor && valor.trim() !== "" ? valor : undefined;
}

export const envPublico = publicoSchema.parse({
  NEXT_PUBLIC_INSFORGE_URL: vacioAUndefined(process.env.NEXT_PUBLIC_INSFORGE_URL),
  NEXT_PUBLIC_INSFORGE_ANON_KEY: vacioAUndefined(process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY),
  NEXT_PUBLIC_SITE_URL: vacioAUndefined(process.env.NEXT_PUBLIC_SITE_URL),
  NEXT_PUBLIC_WHATSAPP: vacioAUndefined(process.env.NEXT_PUBLIC_WHATSAPP),
});

/**
 * En producción (Vercel) la URL pública es obligatoria: canónica, Open Graph,
 * sitemap, robots, JSON-LD, QR y enlaces de los correos salen de ella. Sin esta
 * comprobación, si la variable faltara todo apuntaría a localhost en silencio.
 */
if (process.env.VERCEL_ENV === "production" && /^https?:\/\/(localhost|127\.0\.0\.1)/.test(envPublico.NEXT_PUBLIC_SITE_URL)) {
  throw new Error("NEXT_PUBLIC_SITE_URL debe apuntar al dominio público en producción (por ejemplo https://aguemar.com).");
}

/** true cuando hay URL y anon key de InsForge. */
export const backendConfigurado = Boolean(
  envPublico.NEXT_PUBLIC_INSFORGE_URL && envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY,
);

/** Variables solo de servidor, leídas bajo demanda. */
export function envServidor() {
  return {
    RESEND_API_KEY: vacioAUndefined(process.env.RESEND_API_KEY),
    RESEND_FROM: vacioAUndefined(process.env.RESEND_FROM),
    /** A dónde llegan tus avisos (leads, comentarios, solicitudes, aceptaciones). Si falta, el correo de Mi marca. */
    AVISOS_PARA: vacioAUndefined(process.env.AVISOS_PARA),
    /** Secreto de la tarea diaria (Vercel Cron); su hash sha256 va en ajustes_sistema.cron_hash. */
    CRON_SECRET: vacioAUndefined(process.env.CRON_SECRET),
  };
}
