#!/usr/bin/env node
/**
 * Escribe las secciones <generado:…> de migrations/20261016161523_miembros-cierre-base.sql:
 *   - triggers de columnas de sistema en las 27 tablas,
 *   - las 105 políticas RLS reescritas para exigir es_propietario(),
 *   - revoke execute … from anon en todas las funciones ws_*.
 *
 * InsForge no admite bloques DO con EXECUTE, así que todo va explícito en la
 * migración. Si añades una tabla, añádela a TABLAS y vuelve a correr:
 *   node scripts/generar-cierre-base.mjs
 * (en una migración nueva, copiando el patrón de las secciones generadas).
 */
import { readFileSync, writeFileSync } from "node:fs";

const MIGRACION = new URL("../migrations/20261016161523_miembros-cierre-base.sql", import.meta.url);

/**
 * Tablas con sus políticas vigentes (nombre de política → operación), tal como
 * las devuelve pg_policies en staging el 16/10/2026.
 */
const P = (t, prefijo = t) => ({
  select: `${prefijo}_select_propio`,
  insert: `${prefijo}_insert_propio`,
  update: `${prefijo}_update_propio`,
  delete: `${prefijo}_delete_propio`,
});
const TABLAS = {
  perfil_marca: P("perfil_marca"),
  clientes: P("clientes"),
  equipos: P("equipos"),
  servicios: P("servicios"),
  contadores: P("contadores"),
  cotizaciones: P("cotizaciones"),
  cotizacion_items: P("cotizacion_items"),
  fichas: P("fichas"),
  ficha_diagnosticos: P("ficha_diagnosticos"),
  ficha_trabajos: P("ficha_trabajos"),
  ficha_incidencias: P("ficha_incidencias"),
  ficha_recomendaciones: P("ficha_recomendaciones"),
  plantillas_checklist: P("plantillas_checklist"),
  leads: P("leads"),
  enlaces_publicos: P("enlaces_publicos"),
  trabajos: P("trabajos"),
  trabajo_etapas: P("trabajo_etapas"),
  trabajo_tareas: P("trabajo_tareas"),
  trabajo_entregables: P("trabajo_entregables"),
  comentarios: P("comentarios"),
  cobros: P("cobros"),
  briefs: P("briefs"),
  actas_entrega: P("actas_entrega", "actas"),
  actividades: P("actividades"),
  informes: P("informes"),
  // Solicitudes: las crea la empresa por ws_solicitar, el propietario no las inserta directo.
  solicitudes: { select: "solicitudes_select_propio", update: "solicitudes_update_propio", delete: "solicitudes_delete_propio" },
  // Aceptaciones: constancia de una aceptación. Desde aquí, solo lectura (se elimina la de borrado).
  aceptaciones: { select: "aceptaciones_select_propio", eliminar: ["aceptaciones_delete_propio"] },
};

/** Tablas sin created_at/updated_at: solo se protege owner_id. */
const SIN_FECHAS = new Set(["contadores"]);

const DUENO = "owner_id = (select auth.uid()) and (select public.es_propietario())";
/** Condiciones extra que ya tenían algunas políticas y se conservan. */
const EXTRA = {
  "comentarios.insert": " and es_propietario = true and autor_uid = (select auth.uid())",
};

function politica(tabla, op, nombre) {
  const extra = EXTRA[`${tabla}.${op}`] ?? "";
  const cond = `(${DUENO}${extra})`;
  const cuerpo =
    op === "insert"
      ? `with check ${cond}`
      : op === "update"
        ? `using ${cond} with check ${cond}`
        : `using ${cond}`;
  return [
    `drop policy if exists ${nombre} on public.${tabla};`,
    `create policy ${nombre} on public.${tabla}`,
    `  for ${op} to authenticated ${cuerpo};`,
  ].join("\n");
}

const triggers = [];
const politicas = [];
for (const [tabla, ops] of Object.entries(TABLAS)) {
  if (SIN_FECHAS.has(tabla)) {
    triggers.push(
      `create trigger ${tabla}_sistema before update on public.${tabla}\n  for each row execute function public.owner_inmutable();`,
    );
  } else {
    triggers.push(
      `drop trigger if exists ${tabla}_updated_at on public.${tabla};\ncreate trigger ${tabla}_sistema before insert or update on public.${tabla}\n  for each row execute function public.columnas_sistema();`,
    );
  }

  const bloque = [`-- ${tabla}`];
  for (const op of ["select", "insert", "update", "delete"]) {
    if (ops[op]) bloque.push(politica(tabla, op, ops[op]));
  }
  for (const nombre of ops.eliminar ?? []) bloque.push(`drop policy if exists ${nombre} on public.${tabla};`);
  politicas.push(bloque.join("\n"));
}

/** Firmas de todas las funciones ws_* (pg_proc en staging, 16/10/2026). */
const WS = [
  "ws_aceptar_acta(uuid, text, text)",
  "ws_aceptar_cotizacion(uuid, text, text)",
  "ws_acta(uuid)",
  "ws_actividad(uuid)",
  "ws_admin_set_password(uuid, text)",
  "ws_brief(uuid)",
  "ws_calendario(date, date)",
  "ws_comentar(public.entidad_comentario, uuid, text)",
  "ws_comentarios(public.entidad_comentario, uuid)",
  "ws_correo_usuario(uuid)",
  "ws_cotizaciones()",
  "ws_cotizacion(uuid)",
  "ws_documentos()",
  "ws_empresa_id()",
  "ws_equipos()",
  "ws_ficha(uuid)",
  "ws_informes()",
  "ws_informe(uuid)",
  "ws_inicio()",
  "ws_mi_empresa()",
  "ws_modulo_activo(text)",
  "ws_solicitar(text, text, public.area, public.prioridad, date)",
  "ws_solicitudes()",
  "ws_trabajos()",
  "ws_trabajo(uuid)",
];
const revocar = WS.map((f) => `revoke execute on function public.${f} from public, anon;`);

function reemplazar(sql, marca, contenido) {
  const re = new RegExp(`(-- <generado:${marca}>\\n)[\\s\\S]*?(-- </generado:${marca}>)`);
  if (!re.test(sql)) throw new Error(`No encuentro la sección <generado:${marca}>`);
  return sql.replace(re, `$1${contenido}\n$2`);
}

let sql = readFileSync(MIGRACION, "utf8").replace(/\r\n/g, "\n");
sql = reemplazar(sql, "triggers", triggers.join("\n"));
sql = reemplazar(sql, "politicas", politicas.join("\n\n"));
sql = reemplazar(sql, "revocar-anon", revocar.join("\n"));
writeFileSync(MIGRACION, sql);

const nPol = politicas.join("\n").match(/^create policy /gm)?.length ?? 0;
console.log(`✔ ${triggers.length} tablas con trigger, ${nPol} políticas, ${revocar.length} funciones ws_* sin anon.`);
