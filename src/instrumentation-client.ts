import * as Sentry from "@sentry/nextjs";
import { config as configurarZod } from "zod";
import { opcionesSentry } from "@/lib/sentry";

// Zod 4 prueba `new Function("")` para compilar validadores más rápidos: la CSP lo reporta como
// `script-src` bloqueado aunque no falle. Sin JIT los formularios validan igual y la CSP queda limpia.
configurarZod({ jitless: true });

/** Sentry en el navegador: errores sin capturar y los que muestran las páginas error.tsx. */
Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.NEXT_PUBLIC_VERCEL_ENV));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
