import { cache } from "react";
import { crearClienteServidor } from "@/lib/insforge/server";
import type { FichaJson } from "@/lib/documentos";
import type { WsCotizacion } from "./workspace";

export type DocumentoPortal = { tipo: "ficha"; documento: FichaJson } | { tipo: "cotizacion"; documento: WsCotizacion };

/** Documento por token público (portal_documento valida el token y cuenta la vista). Sin sesión. */
export const portalDocumento = cache(async function portalDocumento(token: string): Promise<DocumentoPortal | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const insforge = await crearClienteServidor();
  if (!insforge) return null;
  const { data, error } = await insforge.database.rpc("portal_documento", { p_token: token });
  if (error || !data) return null;
  return data as DocumentoPortal;
});
