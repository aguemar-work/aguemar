import * as Sentry from "@sentry/nextjs";
import { opcionesSentry } from "@/lib/sentry";

/** Sentry en el servidor (Node y edge). Sin NEXT_PUBLIC_SENTRY_DSN queda apagado. */
export function register() {
  Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV));
}

/** Errores de Server Components, Server Actions, Route Handlers y middleware: llegan con su ruta. */
export const onRequestError = Sentry.captureRequestError;
