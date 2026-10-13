#!/usr/bin/env node
/**
 * Ejecuta db/seed.sql contra el proyecto InsForge vinculado (.insforge/project.json).
 *
 * Uso: npm run db:seed -- tu@correo.com
 *
 * El correo debe pertenecer a un usuario que ya inició sesión en /login:
 * el seed asigna todos los datos a ese propietario.
 *
 * Invoca la CLI con Node directamente (sin shell) porque cmd.exe en Windows
 * limita la línea de comandos a 8 191 caracteres y el seed es más largo.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const correo = process.argv[2];
if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
  console.error("Uso: npm run db:seed -- tu@correo.com");
  process.exit(1);
}

// Se quitan las líneas de comentario: la CLI interpreta un SQL que empieza con "--" como opción.
const sql = readFileSync(new URL("../db/seed.sql", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n")
  .trim()
  .replaceAll("__OWNER_EMAIL__", correo.replaceAll("'", "''"));

const require = createRequire(import.meta.url);
const cliPkg = require.resolve("@insforge/cli/package.json");
const cliBin = new URL(require(cliPkg).bin.insforge, `file://${cliPkg}`);

console.log(`Ejecutando el seed para ${correo}…`);
const r = spawnSync(process.execPath, [cliBin.pathname.replace(/^\/([A-Za-z]:)/, "$1"), "db", "query", "--json", sql], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
if (r.status !== 0 || /"error"/.test(salida)) {
  console.error("El seed falló:\n" + salida);
  process.exit(1);
}
console.log("✔ Seed aplicado. Revisa /panel/clientes para ver al cliente SGC y la ficha FT-2026-001.");
