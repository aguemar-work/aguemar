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

/** true cuando hay URL y anon key de InsForge. */
export const backendConfigurado = Boolean(
  envPublico.NEXT_PUBLIC_INSFORGE_URL && envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY,
);

/** Variables solo de servidor, leídas bajo demanda. */
export function envServidor() {
  return {
    INSFORGE_API_KEY: vacioAUndefined(process.env.INSFORGE_API_KEY),
    RESEND_API_KEY: vacioAUndefined(process.env.RESEND_API_KEY),
    RESEND_FROM: vacioAUndefined(process.env.RESEND_FROM),
    LEADS_NOTIFY_TO: vacioAUndefined(process.env.LEADS_NOTIFY_TO),
    /** A dónde llegan tus avisos (leads, comentarios, solicitudes, aceptaciones). Si falta, el correo de Mi marca. */
    AVISOS_PARA: vacioAUndefined(process.env.AVISOS_PARA) ?? vacioAUndefined(process.env.LEADS_NOTIFY_TO),
    CRON_SECRET: vacioAUndefined(process.env.CRON_SECRET),
  };
}
