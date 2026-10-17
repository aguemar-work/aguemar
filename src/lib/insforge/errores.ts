/**
 * Traduce errores de PostgREST / Postgres a mensajes claros para el usuario,
 * indicando además a qué campo pertenecen cuando se puede deducir.
 */

export interface ErrorTraducido {
  mensaje: string;
  campo?: string;
}

interface ErrorPostgrest {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
  statusCode?: number;
  error?: string;
}

const UNICOS: Record<string, ErrorTraducido> = {
  equipos_cliente_id_serie_key: {
    campo: "serie",
    mensaje: "Este cliente ya tiene un equipo con ese número de serie.",
  },
  clientes_owner_doc_idx: {
    campo: "num_doc",
    mensaje: "Ya existe un cliente con ese número de documento.",
  },
  plantillas_checklist_owner_id_tipo_servicio_key: {
    campo: "tipo_servicio",
    mensaje: "Ya existe una plantilla para ese tipo de servicio.",
  },
  perfil_marca_owner_id_key: {
    mensaje: "Ya existe un perfil de marca. Edita el actual en lugar de crear otro.",
  },
};

export function traducirError(error: unknown): ErrorTraducido {
  // Errores propios de la app (exigirPropietario, conSesion): su mensaje ya es para el usuario.
  if (error instanceof Error && (error.name === "SinPermisoError" || error.name === "SinSesionError")) {
    return { mensaje: error.message };
  }
  const e = (error ?? {}) as ErrorPostgrest;
  const texto = `${e.message ?? ""} ${e.details ?? ""}`;

  if (e.code === "23505") {
    for (const [restriccion, traducido] of Object.entries(UNICOS)) {
      if (texto.includes(restriccion)) return traducido;
    }
    return { mensaje: "Ya existe un registro con esos datos." };
  }
  if (e.code === "23503") {
    if (/cobros/.test(texto)) {
      return { mensaje: "No se puede eliminar: la empresa tiene cobros registrados." };
    }
    if (/cotizaciones|fichas/.test(texto)) {
      return { mensaje: "No se puede eliminar: tiene cotizaciones o fichas asociadas." };
    }
    return { mensaje: "No se puede completar: hay registros que dependen de este." };
  }
  if (e.code === "23514") {
    if (texto.includes("clientes_num_doc_formato")) {
      return { campo: "num_doc", mensaje: "El número de documento no tiene el formato correcto." };
    }
    return { mensaje: "Algún dato no cumple las reglas de validación." };
  }
  // Bloqueos propios de la base (Fase 13): el mensaje ya viene en español.
  if (e.code === "42501" && /^No puedes vincular|^Ese usuario no pertenece/.test(e.message ?? "")) {
    return { mensaje: e.message! };
  }
  if (e.code === "42501" || e.statusCode === 403) {
    return { mensaje: "No tienes permiso para esta acción. Vuelve a iniciar sesión." };
  }
  // Mensajes propios de nuestras funciones SQL (raise exception ... using errcode): ya vienen en español.
  if ((e.code === "22023" || e.code === "P0002" || e.code === "22001" || e.code === "53400" || e.code === "55000") && e.message) {
    return { mensaje: e.message };
  }
  if (e.code === "PGRST116") {
    return { mensaje: "No encontramos el registro. Puede que haya sido eliminado." };
  }
  if (e.statusCode === 401) {
    return { mensaje: "Tu sesión venció. Vuelve a iniciar sesión." };
  }
  return { mensaje: e.message ? `No se pudo completar: ${e.message}` : "Ocurrió un error inesperado. Inténtalo de nuevo." };
}

/**
 * Segundos que InsForge pide esperar antes de reenviar un código al mismo correo
 * ("Please wait 41 seconds before requesting another code…"). `null` si no es ese error.
 */
export function segundosDeEspera(error: unknown): number | null {
  const e = (error ?? {}) as ErrorPostgrest;
  const m = /wait (\d+) seconds?/i.exec(e.message ?? "");
  if (m) return Number(m[1]);
  return e.statusCode === 429 ? 60 : null;
}
