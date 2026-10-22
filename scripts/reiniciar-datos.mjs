#!/usr/bin/env node
/**
 * Reinicia los datos del proyecto InsForge vinculado (.insforge/project.json) con db/reiniciar-datos.sql:
 * borra todo lo operativo y conserva Mi marca, servicios, plantillas, el propietario y ajustes_sistema.
 *
 * Uso: npm run db:reiniciar -- <nombre del contexto actual> [--todo]
 *   - El nombre debe coincidir con el contexto de la CLI (`staging`, `Project_AGUEMAR`…): es el seguro
 *     para no vaciar producción por error creyendo estar en staging.
 *   - `--todo` borra también Mi marca, servicios y plantillas (para dejar staging listo para
 *     `npm run staging:cuentas`, que vuelve a sembrar; el seed se niega si ya hay perfil de marca).
 *
 * Antes de borrar hace un respaldo con scripts/respaldo.mjs en `_respaldos/`; si el respaldo falla, no borra.
 * Las cuentas de auth.users no se tocan (ver el comentario del SQL).
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const todo = args.includes("--todo");
const nombre = args.find((a) => !a.startsWith("--"));

const proyecto = JSON.parse(readFileSync(".insforge/project.json", "utf8"));
if (!nombre) {
  console.error(`Uso: npm run db:reiniciar -- <nombre del contexto> [--todo]\nEl contexto actual de la CLI es "${proyecto.project_name}".`);
  process.exit(1);
}
if (nombre !== proyecto.project_name) {
  console.error(`Escribiste "${nombre}" pero la CLI apunta a "${proyecto.project_name}" (${proyecto.oss_host}). No se borró nada.`);
  process.exit(1);
}

const require = createRequire(import.meta.url);
const cliPkg = require.resolve("@insforge/cli/package.json");
const cliBin = new URL(require(cliPkg).bin.insforge, `file://${cliPkg}`).pathname.replace(/^\/([A-Za-z]:)/, "$1");

function consulta(sql) {
  const r = spawnSync(process.execPath, [cliBin, "db", "query", "--json", sql], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  const salida = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (r.status !== 0 || /"error"/.test(salida)) throw new Error(`La consulta falló:\n${salida}`);
  try {
    const json = JSON.parse(salida.slice(salida.indexOf("{")));
    return json.rows ?? json.data ?? json;
  } catch {
    return salida;
  }
}

// ---------- respaldo previo ----------
console.log(`Contexto: ${proyecto.project_name} (${proyecto.oss_host}). Respaldo previo en _respaldos/…`);
const respaldo = spawnSync(process.execPath, ["scripts/respaldo.mjs", "_respaldos"], { encoding: "utf8", stdio: "inherit" });
if (respaldo.status !== 0) {
  console.error("El respaldo falló: no se borró nada.");
  process.exit(respaldo.status ?? 1);
}

// ---------- borrado ----------
// Se quitan las líneas de comentario: la CLI interpreta un SQL que empieza con "--" como opción.
let sql = readFileSync(new URL("../db/reiniciar-datos.sql", import.meta.url), "utf8")
  .split(/\r?\n/)
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n")
  .trim();
if (todo) sql += "\ntruncate table public.perfil_marca, public.servicios, public.plantillas_checklist cascade;";

console.log(todo ? "Borrando todo, incluida la configuración…" : "Borrando los datos operativos (se conserva la configuración)…");
consulta(sql);

const tablas = ["clientes", "trabajos", "cotizaciones", "cobros", "fichas", "informes", "leads", "invitaciones", "perfil_marca", "servicios", "miembros"];
const conteo = consulta(`select ${tablas.map((t) => `(select count(*)::int from public.${t}) as ${t}`).join(", ")}`);
console.log("✔ Listo. Filas que quedan:", JSON.stringify(Array.isArray(conteo) ? conteo[0] : conteo));
console.log("Las cuentas de auth.users no se tocan: borra las de empresas y colaboradores en InsForge → Auth → Users si no las vas a reutilizar.");
