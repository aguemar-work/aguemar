#!/usr/bin/env node
/**
 * Escribe las secciones <generado:…> de migrations/20261016200506_equipo-invitaciones.sql:
 *   - triggers <tabla>_dueno (lo que crea un colaborador queda a nombre del propietario),
 *   - políticas del colaborador acotadas a sus empresas asignadas.
 *
 * InsForge no admite bloques DO con EXECUTE, así que todo va explícito.
 *   node scripts/generar-equipo.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const MIGRACION = new URL("../migrations/20261016200506_equipo-invitaciones.sql", import.meta.url);

const DUENO = "owner_id = (select public.dueno_estudio())";
const porCliente = "public.cliente_asignado(cliente_id)";
const conTrabajo = "(trabajo_id is null or public.trabajo_asignado(trabajo_id))";

/**
 * Tabla → { cond: condición de acceso, ops: operaciones permitidas, check?: condición extra al escribir }.
 * trabajos y clientes no están: el colaborador los lee por las vistas *_equipo.
 */
const TABLAS = {
  trabajo_etapas: { cond: "public.trabajo_asignado(trabajo_id)", ops: ["select"] },
  trabajo_tareas: { cond: "public.trabajo_asignado(trabajo_id)", ops: ["select", "insert", "update", "delete"] },
  trabajo_entregables: { cond: "public.trabajo_asignado(trabajo_id)", ops: ["select", "insert", "update", "delete"] },
  actividades: { cond: porCliente, ops: ["select", "insert", "update", "delete"], check: conTrabajo },
  equipos: { cond: porCliente, ops: ["select", "insert", "update"] },
  fichas: { cond: porCliente, ops: ["select", "insert", "update"], check: conTrabajo },
  ficha_diagnosticos: { cond: "public.ficha_asignada(ficha_id)", ops: ["select", "insert", "update", "delete"] },
  ficha_trabajos: { cond: "public.ficha_asignada(ficha_id)", ops: ["select", "insert", "update", "delete"] },
  ficha_incidencias: { cond: "public.ficha_asignada(ficha_id)", ops: ["select", "insert", "update", "delete"] },
  ficha_recomendaciones: { cond: "public.ficha_asignada(ficha_id)", ops: ["select", "insert", "update", "delete"] },
  informes: { cond: porCliente, ops: ["select", "insert", "update"], check: conTrabajo },
  briefs: { cond: porCliente, ops: ["select", "insert", "update"], check: conTrabajo },
  actas_entrega: { cond: porCliente, ops: ["select", "insert", "update"], check: conTrabajo },
  comentarios: {
    cond: `${porCliente} and entidad <> 'cotizacion' and public.entidad_asignada(entidad, entidad_id)`,
    ops: ["select", "insert", "update"],
    // Lo que escribe el colaborador sale como del estudio y con su autoría.
    checkInsert: "es_propietario = true and autor_uid = (select auth.uid())",
  },
  enlaces_publicos: { cond: "public.documento_asignado(tipo, documento_id)", ops: ["select", "insert", "update"] },
};

/** Tablas donde el colaborador inserta: llevan el trigger <tabla>_dueno. */
const CON_DUENO = Object.entries(TABLAS)
  .filter(([, t]) => t.ops.includes("insert"))
  .map(([tabla]) => tabla);

function politica(tabla, op, t) {
  const base = `${DUENO} and ${t.cond}`;
  const escritura = [base, t.check, op === "insert" ? t.checkInsert : null].filter(Boolean).join(" and ");
  const nombre = `${tabla}_colaborador_${op}`;
  const cuerpo =
    op === "insert"
      ? `with check (${escritura})`
      : op === "update"
        ? `using (${base}) with check (${escritura})`
        : `using (${base})`;
  return `create policy ${nombre} on public.${tabla}\n  for ${op} to authenticated ${cuerpo};`;
}

const triggers = CON_DUENO.map(
  (tabla) => `create trigger ${tabla}_dueno before insert on public.${tabla}\n  for each row execute function public.fijar_dueno();`,
);
const politicas = Object.entries(TABLAS).map(([tabla, t]) =>
  [`-- ${tabla}`, ...t.ops.map((op) => politica(tabla, op, t))].join("\n"),
);

function reemplazar(sql, marca, contenido) {
  const re = new RegExp(`(-- <generado:${marca}>\\n)[\\s\\S]*?(-- </generado:${marca}>)`);
  if (!re.test(sql)) throw new Error(`No encuentro la sección <generado:${marca}>`);
  return sql.replace(re, `$1${contenido}\n$2`);
}

let sql = readFileSync(MIGRACION, "utf8").replace(/\r\n/g, "\n");
sql = reemplazar(sql, "dueno", triggers.join("\n"));
sql = reemplazar(sql, "politicas", politicas.join("\n\n"));
writeFileSync(MIGRACION, sql);

const nPol = politicas.join("\n").match(/^create policy /gm)?.length ?? 0;
console.log(`✔ ${triggers.length} triggers _dueno y ${nPol} políticas de colaborador.`);
