#!/usr/bin/env node
/**
 * Prepara la rama `staging` de InsForge con cuentas de prueba y datos de ejemplo:
 *   - propietario (E2E_EMAIL / E2E_PASSWORD) con el seed de db/seed.sql (marca, servicios, SGC…)
 *   - empresa A (E2E_EMPRESA_EMAIL) vinculada a SGC
 *   - empresa B (E2E_EMPRESA_B_EMAIL) vinculada a una segunda empresa, para los tests de aislamiento
 *
 * Uso: npm run staging:cuentas
 *
 * Es idempotente (se puede repetir) y se niega a correr si el contexto de la CLI
 * no es una rama (`branched_from`) o si .env.local no apunta a esa misma rama:
 * nunca crea cuentas ni datos de prueba en producción.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createClient } from "@insforge/sdk";

// ---------- entorno ----------
const env = {};
for (const linea of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const obligatorias = ["NEXT_PUBLIC_INSFORGE_URL", "NEXT_PUBLIC_INSFORGE_ANON_KEY", "E2E_EMAIL", "E2E_PASSWORD", "E2E_EMPRESA_EMAIL", "E2E_EMPRESA_PASSWORD", "E2E_EMPRESA_B_EMAIL", "E2E_EMPRESA_B_PASSWORD"];
const faltan = obligatorias.filter((k) => !env[k]);
if (faltan.length) {
  console.error(`Faltan en .env.local: ${faltan.join(", ")}`);
  process.exit(1);
}

// ---------- guarda: solo ramas ----------
const proyecto = JSON.parse(readFileSync(".insforge/project.json", "utf8"));
if (!proyecto.branched_from) {
  console.error(`La CLI apunta a "${proyecto.project_name}", que no es una rama. Cambia a staging: npx insforge branch switch staging`);
  process.exit(1);
}
if (proyecto.oss_host.replace(/\/$/, "") !== env.NEXT_PUBLIC_INSFORGE_URL.replace(/\/$/, "")) {
  console.error(`.env.local apunta a ${env.NEXT_PUBLIC_INSFORGE_URL} pero la CLI está en ${proyecto.oss_host}. Deben coincidir.`);
  process.exit(1);
}
console.log(`Rama: ${proyecto.project_name} (${proyecto.oss_host})`);

// ---------- CLI ----------
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

// ---------- cuentas ----------
const cliente = createClient({ baseUrl: env.NEXT_PUBLIC_INSFORGE_URL, anonKey: env.NEXT_PUBLIC_INSFORGE_ANON_KEY, isServerMode: true });

async function asegurarUsuario(correo, contrasena, nombre) {
  const alta = await cliente.auth.signUp({ email: correo, password: contrasena, name: nombre });
  if (!alta.error && alta.data?.user?.id) {
    console.log(`✔ Usuario creado: ${correo}`);
    return alta.data.user.id;
  }
  const entrada = await cliente.auth.signInWithPassword({ email: correo, password: contrasena });
  if (entrada.error || !entrada.data?.user?.id) {
    throw new Error(`No se pudo crear ni entrar con ${correo}: ${alta.error?.message ?? entrada.error?.message}`);
  }
  console.log(`· Usuario ya existía: ${correo}`);
  return entrada.data.user.id;
}

const propietario = await asegurarUsuario(env.E2E_EMAIL, env.E2E_PASSWORD, "Propietario de prueba");
const empresaA = await asegurarUsuario(env.E2E_EMPRESA_EMAIL, env.E2E_EMPRESA_PASSWORD, "Empresa A de prueba");
const empresaB = await asegurarUsuario(env.E2E_EMPRESA_B_EMAIL, env.E2E_EMPRESA_B_PASSWORD, "Empresa B de prueba");

// ---------- seed del propietario ----------
const hayMarca = consulta(`select count(*)::int as n from public.perfil_marca where owner_id = '${propietario}'`);
if (Array.isArray(hayMarca) && hayMarca[0]?.n > 0) {
  console.log("· El seed ya estaba aplicado.");
} else {
  const r = spawnSync(process.execPath, ["scripts/seed.mjs", env.E2E_EMAIL], { encoding: "utf8", stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// ---------- empresas y accesos ----------
consulta(`
update public.clientes set usuario_id = '${empresaA}', modulos = '{calendario,proyectos,informes,documentos,cotizaciones,equipos,solicitudes}'
 where owner_id = '${propietario}' and slug = 'sgc' and (usuario_id is null or usuario_id = '${empresaA}');
insert into public.clientes (owner_id, nombre, slug, modulos, tipo_doc, num_doc, contacto, telefono, correo, direccion, usuario_id)
select '${propietario}', 'Empresa B (prueba)', 'empresa-b', '{calendario,proyectos,informes,documentos,cotizaciones,equipos,solicitudes}', 'RUC', '20123456789',
       'Contacto B', '+51 900 000 000', '${env.E2E_EMPRESA_B_EMAIL}', 'Lima', '${empresaB}'
 where not exists (select 1 from public.clientes where owner_id = '${propietario}' and slug = 'empresa-b');
insert into public.trabajos (owner_id, cliente_id, area, titulo, estado, visible_empresa)
select '${propietario}', c.id, 'desarrollo', 'Trabajo de la empresa B (visible)', 'en_curso', true
  from public.clientes c where c.owner_id = '${propietario}' and c.slug = 'empresa-b'
   and not exists (select 1 from public.trabajos t where t.cliente_id = c.id);
`);
const resumen = consulta(`select c.slug, c.usuario_id is not null as con_acceso, (select count(*)::int from public.trabajos t where t.cliente_id = c.id) as trabajos from public.clientes c where c.owner_id = '${propietario}' order by c.slug`);
console.log("✔ Empresas en staging:", JSON.stringify(resumen));
console.log("Listo. Entra en http://localhost:3000/login con E2E_EMAIL para ver el panel, o con E2E_EMPRESA_EMAIL para el workspace /w/sgc.");
