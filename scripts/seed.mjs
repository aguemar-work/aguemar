#!/usr/bin/env node
/**
 * Ejecuta db/seed.sql contra el proyecto InsForge vinculado (.insforge/project.json).
 *
 * Uso: npm run db:seed -- tu@correo.com
 *
 * El correo debe pertenecer a un usuario que ya inició sesión en /login:
 * el seed asigna todos los datos a ese propietario.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const correo = process.argv[2];
if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
  console.error("Uso: npm run db:seed -- tu@correo.com");
  process.exit(1);
}

const sql = readFileSync(new URL("../db/seed.sql", import.meta.url), "utf8").replaceAll(
  "__OWNER_EMAIL__",
  correo.replaceAll("'", "''"),
);

console.log(`Ejecutando el seed para ${correo}…`);
const r = spawnSync("npx", ["-y", "@insforge/cli", "db", "query", sql, "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 10 * 1024 * 1024,
});

const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
if (r.status !== 0 || /"error"/.test(salida)) {
  console.error("El seed falló:\n" + salida);
  process.exit(1);
}
console.log("✔ Seed aplicado. Revisa /panel/clientes para ver al cliente SGC y la ficha FT-2026-001.");
