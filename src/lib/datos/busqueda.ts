/**
 * Texto de búsqueda seguro para los filtros `.or("campo.ilike.%…%")` de PostgREST.
 *
 * El texto va dentro de la sintaxis del filtro, así que una coma, un paréntesis o
 * una comilla cambiarían su estructura; `%` y `_` son comodines de `ilike`; `\` escapa.
 * Se sustituyen por espacios (siguen funcionando como separador de palabras) y se
 * acorta a 80 caracteres para no mandar enlaces enormes a la base.
 */
export function patronBusqueda(texto: string | null | undefined): string {
  return (texto ?? "")
    .replace(/[%_,()\\"'*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * Filtro `.or()` listo para PostgREST: `campo1.ilike.%q%,campo2.ilike.%q%`.
 * Si el texto queda vacío tras limpiarlo, el patrón `%%` deja pasar todo (como sin filtro).
 */
export function filtroOr(texto: string | null | undefined, campos: string[]): string {
  const q = patronBusqueda(texto);
  return campos.map((campo) => `${campo}.ilike.%${q}%`).join(",");
}
