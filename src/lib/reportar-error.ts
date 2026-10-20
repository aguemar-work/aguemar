import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Para las páginas error.tsx: React atrapa el error antes que Sentry, así que se reporta aquí.
 * Con `digest` el error vino del servidor y ya lo reportó onRequestError (instrumentation.ts).
 */
export function useReportarError(error: Error & { digest?: string }) {
  useEffect(() => {
    console.error(error);
    if (!error.digest) Sentry.captureException(error);
  }, [error]);
}
