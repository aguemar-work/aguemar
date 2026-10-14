/** Genera un slug de URL a partir de un nombre: minúsculas, sin acentos ni símbolos, guiones simples. */
export function generarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

export function esSlugValido(slug: string): boolean {
  return SLUG_REGEX.test(slug);
}
