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
  const e = (error ?? {}) as ErrorPostgrest;
  const texto = `${e.message ?? ""} ${e.details ?? ""}`;

  if (e.code === "23505") {
    for (const [restriccion, traducido] of Object.entries(UNICOS)) {
      if (texto.includes(restriccion)) return traducido;
    }
    return { mensaje: "Ya existe un registro con esos datos." };
  }
  if (e.code === "23503") {
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
  if (e.code === "42501" || e.statusCode === 403) {
    return { mensaje: "No tienes permiso para esta acción. Vuelve a iniciar sesión." };
  }
  if (e.code === "PGRST116") {
    return { mensaje: "No encontramos el registro. Puede que haya sido eliminado." };
  }
  if (e.statusCode === 401) {
    return { mensaje: "Tu sesión venció. Vuelve a iniciar sesión." };
  }
  return { mensaje: e.message ? `No se pudo completar: ${e.message}` : "Ocurrió un error inesperado. Inténtalo de nuevo." };
}
