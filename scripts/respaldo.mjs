/**
 * Respaldo propio de la base fuera de InsForge (ARQUITECTURA.md, ADR-06).
 *
 *   npm run db:respaldo -- "<carpeta cifrada fuera del repo>"
 *
 * Exporta el proyecto del contexto actual de la CLI (para producción: antes
 * `npx insforge branch switch --parent`, y después volver a staging) con esquema, funciones,
 * vistas, secuencias y TODAS las filas (la CLI corta en 1000 por tabla si no se le dice otra cosa),
 * y lo guarda como `aguemar-<proyecto>-AAAA-MM-DD-HHMM.sql`.
 *
 * No incluye las cuentas (auth.users): sirve para recuperar datos tras un error propio y para
 * llevarse los datos a otro proveedor. La recuperación completa necesita además el respaldo de InsForge.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const destino = process.argv[2];
if (!destino) {
  console.error('Uso: npm run db:respaldo -- "<carpeta cifrada fuera del repo>"');
  process.exit(1);
}
const carpeta = resolve(destino);
if (carpeta.toLowerCase().startsWith(resolve(".").toLowerCase())) {
  console.error("El respaldo tiene datos personales: guárdalo fuera del repositorio, en una carpeta cifrada.");
  process.exit(1);
}
mkdirSync(carpeta, { recursive: true });

const contexto = JSON.parse(execSync("npx insforge current --json", { encoding: "utf8" }));
const proyecto = String(contexto.project?.project_name ?? "desconocido").replace(/[^A-Za-z0-9_-]/g, "_");
const sello = new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace(/[: ]/g, "-").slice(0, 16).replace(/-(\d\d)-(\d\d)$/, "-$1$2");
const final = join(carpeta, `aguemar-${proyecto}-${sello}.sql`);
const temporal = `${final}.json`;

console.log(`Exportando "${proyecto}"…`);
// 10 000 filas por tabla es el máximo que acepta la CLI; si una tabla lo alcanza, el respaldo queda incompleto.
const TOPE = 10000;
execSync(`npx insforge db export --include-functions --include-views --include-sequences --row-limit ${TOPE} -o "${temporal}"`, { stdio: "inherit" });

try {
  const { data } = JSON.parse(readFileSync(temporal, "utf8"));
  if (typeof data !== "string" || !data.includes("-- Table: ")) throw new Error("El export no trae tablas.");
  // Un INSERT por fila, agrupados bajo "-- Table: <nombre>".
  const filas = data
    .split("-- Table: ")
    .slice(1)
    .map((bloque) => ({ tabla: bloque.split("\n")[0].trim(), filas: (bloque.match(/^INSERT INTO /gm) ?? []).length }));
  const cortadas = filas.filter((t) => t.filas >= TOPE).map((t) => t.tabla);
  const archivo = cortadas.length ? final.replace(/\.sql$/, "-INCOMPLETO.sql") : final;
  writeFileSync(archivo, data);

  const funciones = (data.match(/CREATE (OR REPLACE )?FUNCTION/gi) ?? []).length;
  const total = filas.reduce((s, t) => s + t.filas, 0);
  console.log(`Listo: ${archivo}`);
  console.log(`${filas.length} tablas, ${total} filas, ${funciones} funciones, ${(statSync(archivo).size / 1024).toFixed(0)} KB. Sin cuentas de auth.`);
  if (cortadas.length) {
    console.error(`INCOMPLETO: ${cortadas.join(", ")} llegaron al tope de ${TOPE} filas de la CLI. Usa el respaldo de InsForge o un pg_dump.`);
    process.exitCode = 1;
  }
} finally {
  rmSync(temporal, { force: true });
}
