/**
 * Lee migrations/*.sql en orden y reconstruye el estado vigente de cada función de `public`:
 * su última definición, si es security definer, su search_path y quién puede ejecutarla.
 *
 * Lo usan `npm run db:funciones` (vuelca las definiciones vigentes a db/funciones/) y el test
 * tests/unit/migraciones.node.test.ts (inventario de seguridad de las funciones).
 *
 * Supone las convenciones del repo: cuerpos entre `$$`, sin sobrecargas de nombre y
 * grant/revoke por función. Postgres da EXECUTE a PUBLIC al crear una función: hasta que
 * una migración lo revoca, cuenta como pública.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RE_CREAR = /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z_0-9]+)\s*\(/gi;
const RE_BORRAR = /drop\s+function\s+(?:if\s+exists\s+)?public\.([a-z_0-9]+)\s*\(/gi;
const RE_PERMISO = /\b(grant|revoke)\s+[a-z ,]+?\s+on\s+function\s+([\s\S]+?)\s+(to|from)\s+([a-z_, ]+?)\s*;/gi;

export function leerMigraciones(dir = "migrations") {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((archivo) => ({ archivo, sql: readFileSync(join(dir, archivo), "utf8") }));
}

/** Eventos de un archivo (crear, borrar, permisos), en orden, ignorando lo que está dentro de un cuerpo $$…$$. */
function eventos(archivo, sql) {
  const lista = [];
  const cuerpos = [];

  for (const m of sql.matchAll(RE_CREAR)) {
    const abre = sql.indexOf("$$", m.index);
    const cierra = abre < 0 ? -1 : sql.indexOf("$$", abre + 2);
    const fin = cierra < 0 ? -1 : sql.indexOf(";", cierra + 2);
    if (fin < 0) throw new Error(`${archivo}: no encuentro el cuerpo de public.${m[1]}`);
    const definicion = sql.slice(m.index, fin + 1);
    const atributos = (sql.slice(m.index, abre) + sql.slice(cierra + 2, fin)).toLowerCase();
    cuerpos.push([abre, cierra]);
    lista.push({
      tipo: "crear",
      pos: m.index,
      nombre: m[1].toLowerCase(),
      definicion,
      securityDefiner: /\bsecurity\s+definer\b/.test(atributos),
      searchPath: (atributos.match(/\bset\s+search_path\s*=\s*([^\n]+)/) ?? [])[1]?.trim() ?? null,
    });
  }

  const dentroDeCuerpo = (pos) => cuerpos.some(([a, b]) => pos > a && pos < b);

  for (const m of sql.matchAll(RE_BORRAR)) {
    if (!dentroDeCuerpo(m.index)) lista.push({ tipo: "borrar", pos: m.index, nombre: m[1].toLowerCase() });
  }
  for (const m of sql.matchAll(RE_PERMISO)) {
    if (dentroDeCuerpo(m.index)) continue;
    const roles = m[4].split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
    for (const f of m[2].matchAll(/public\.([a-z_0-9]+)\s*\(/gi)) {
      lista.push({ tipo: m[1].toLowerCase(), pos: m.index, nombre: f[1].toLowerCase(), roles });
    }
  }
  return lista.sort((a, b) => a.pos - b.pos);
}

/**
 * Estado vigente: Map nombre → { nombre, archivo, definicion, securityDefiner, searchPath, roles }.
 * `roles` es quién puede ejecutarla además de su dueño (incluye "public" si nunca se revocó).
 */
export function funcionesVigentes(migraciones = leerMigraciones()) {
  const vigentes = new Map();
  for (const { archivo, sql } of migraciones) {
    for (const e of eventos(archivo, sql)) {
      const actual = vigentes.get(e.nombre);
      if (e.tipo === "crear") {
        // create or replace conserva los permisos; una función nueva nace ejecutable por PUBLIC.
        const roles = actual ? actual.roles : new Set(["public"]);
        vigentes.set(e.nombre, { nombre: e.nombre, archivo, definicion: e.definicion, securityDefiner: e.securityDefiner, searchPath: e.searchPath, roles });
      } else if (e.tipo === "borrar") {
        vigentes.delete(e.nombre);
      } else if (actual) {
        for (const r of e.roles) {
          if (e.tipo === "grant") actual.roles.add(r);
          else actual.roles.delete(r);
        }
      }
    }
  }
  return vigentes;
}

/** Contenido de db/funciones/<nombre>.sql para una función vigente. */
export function archivoFuncion(f) {
  return `-- Vigente según migrations/${f.archivo}.\n-- Generado con \`npm run db:funciones\`: no se edita a mano; los cambios van en una migración nueva.\n\n${f.definicion}\n`;
}
