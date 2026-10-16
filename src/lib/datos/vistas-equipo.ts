/**
 * El colaborador no lee las tablas trabajos y clientes (ahí están monto_estimado y
 * las notas internas): lee las vistas *_equipo, con esas columnas en null.
 */
export const VISTAS_EQUIPO: Record<string, string> = { clientes: "clientes_equipo", trabajos: "trabajos_equipo" };

/**
 * Reescribe un select para el colaborador: `clientes(id, nombre)` → `clientes:clientes_equipo(id, nombre)`.
 * El alias conserva el nombre de siempre, así que el resto del código no cambia.
 * No toca otras relaciones (`trabajo_tareas(…)`) ni columnas como `cliente_id`.
 */
export function selectParaEquipo(columnas: string): string {
  return columnas.replace(
    /(^|[\s,(])(clientes|trabajos)(![a-z_]+)?\(/g,
    (_, antes: string, tabla: string, mod: string | undefined) => `${antes}${tabla}:${VISTAS_EQUIPO[tabla]}${mod ?? ""}(`,
  );
}
