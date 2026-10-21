import * as Sentry from "@sentry/nextjs";
import { opcionesSentry } from "@/lib/sentry";

/** Sentry en el navegador: errores sin capturar y los que muestran las páginas error.tsx. */
Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.NEXT_PUBLIC_VERCEL_ENV));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
