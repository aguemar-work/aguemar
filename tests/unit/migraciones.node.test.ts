import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// Módulo .mjs compartido con el script npm run db:funciones.
import { archivoFuncion, funcionesVigentes } from "../../scripts/lib/funciones-sql.mjs";

/**
 * Inventario de seguridad de las funciones SQL (ARQUITECTURA.md, ADR-03 y ADR-09), leído de
 * migrations/ sin conectarse a la base: corre en CI sin secretos.
 */
type Funcion = { nombre: string; archivo: string; definicion: string; securityDefiner: boolean; searchPath: string | null; roles: Set<string> };
const vigentes = [...(funcionesVigentes() as Map<string, Funcion>).values()];

/** Las únicas que puede llamar un visitante sin sesión, cada una con su propia barrera. */
const PARA_ANON = new Set([
  "landing_datos", // datos públicos de la landing
  "crear_lead", // formulario, con tope por IP y global
  "registrar_evento", // contador de clics de la landing, lista cerrada y tope por día
  "portal_documento", // token de 256 bits
  "aceptar_cotizacion", // token + nombre y DNI
  "aceptar_acta", // token + nombre y DNI
  "invitacion_ver", // token de un solo uso
  "cobro_recordatorios_tomar", // clave del cron comparada por hash
  "cobro_recordatorios_fallidos", // clave del cron comparada por hash
]);

/** Piezas internas: solo las llaman otras funciones (security definer), nunca la API. */
const INTERNA = /(_core|_json|_json_vivo|_contenido)$|^huella_documento$|^dni_visible$/;

describe("funciones SQL vigentes", () => {
  it("se leen todas las migraciones", () => {
    expect(vigentes.length).toBeGreaterThan(80);
  });

  it("toda security definer fija search_path = pg_catalog, public, pg_temp", () => {
    const mal = vigentes.filter((f) => f.securityDefiner && f.searchPath !== "pg_catalog, public, pg_temp").map((f) => `${f.nombre} (${f.archivo})`);
    expect(mal).toEqual([]);
  });

  it("ninguna security definer queda ejecutable por PUBLIC (hay que revocarlo al crearla)", () => {
    const mal = vigentes.filter((f) => f.securityDefiner && f.roles.has("public")).map((f) => `${f.nombre} (${f.archivo})`);
    expect(mal).toEqual([]);
  });

  it("anon solo ejecuta las funciones públicas por diseño", () => {
    const conAnon = vigentes.filter((f) => f.roles.has("anon") || (f.securityDefiner && f.roles.has("public"))).map((f) => f.nombre);
    expect(conAnon.filter((n) => !PARA_ANON.has(n))).toEqual([]);
  });

  it("las piezas internas no se exponen a la API", () => {
    const mal = vigentes.filter((f) => INTERNA.test(f.nombre) && f.roles.size > 0).map((f) => `${f.nombre}: ${[...f.roles].join(", ")}`);
    expect(mal).toEqual([]);
  });

  it("db/funciones/ está al día (npm run db:funciones)", () => {
    const dir = join("db", "funciones");
    const enDisco = new Map(
      readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .map((f) => [f.replace(/\.sql$/, ""), readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n")]),
    );
    const desactualizadas = vigentes.filter((f) => enDisco.get(f.nombre) !== archivoFuncion(f).replace(/\r\n/g, "\n")).map((f) => f.nombre);
    const sobrantes = [...enDisco.keys()].filter((n) => !vigentes.some((f) => f.nombre === n));
    expect({ desactualizadas, sobrantes }).toEqual({ desactualizadas: [], sobrantes: [] });
  });
});

/**
 * Vistas de `public` (SEC-007). Las vistas del colaborador (`*_equipo`) NO usan `security_invoker`
 * a propósito: el colaborador no tiene políticas sobre `clientes` ni `trabajos` y las lee solo por
 * estas vistas, que corren con los privilegios de su dueño. Lo único que las aísla es su `where`
 * con `cliente_asignado(...)`; si una vista nueva lo olvida, abre la tabla a cualquier autenticado.
 * Este inventario falla en ese caso (el de las funciones no mira las vistas).
 */
function vistasVigentes(): Map<string, string> {
  const dir = join(process.cwd(), "migrations");
  const vistas = new Map<string, string>();
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, f), "utf8").replace(/\r\n/g, "\n");
    // Orden de aparición dentro del archivo: un drop posterior a un create la retira.
    const sentencias = [...sql.matchAll(/(create\s+(?:or\s+replace\s+)?view\s+public\.(\w+)[^;]*;)|(drop\s+view\s+(?:if\s+exists\s+)?public\.(\w+)[^;]*;)/gi)];
    for (const m of sentencias) {
      if (m[1]) vistas.set(m[2], m[1]);
      else vistas.delete(m[4]);
    }
  }
  return vistas;
}

/** Vistas que no filtran por asignación porque no exponen datos de empresas. Vacía hoy. */
const VISTAS_SIN_FILTRO = new Set<string>();

function vistasSinFiltro(vistas: Map<string, string>, permitidas: Set<string>): string[] {
  return [...vistas].filter(([nombre, sql]) => !permitidas.has(nombre) && !/cliente_asignado\s*\(/i.test(sql)).map(([nombre]) => nombre);
}

describe("vistas de public", () => {
  const vistas = vistasVigentes();

  it("se leen las vistas del colaborador", () => {
    expect([...vistas.keys()].sort()).toEqual(expect.arrayContaining(["clientes_equipo", "trabajos_equipo"]));
  });

  it("toda vista filtra con cliente_asignado(...) o está en la lista con su motivo", () => {
    expect(vistasSinFiltro(vistas, VISTAS_SIN_FILTRO)).toEqual([]);
  });

  it("detecta una vista sin filtro y respeta la lista de permitidas", () => {
    const ejemplo = new Map([
      ["bien", "create view public.bien as select * from public.clientes where public.cliente_asignado(id);"],
      ["mal", "create view public.mal as select * from public.clientes;"],
    ]);
    expect(vistasSinFiltro(ejemplo, new Set())).toEqual(["mal"]);
    expect(vistasSinFiltro(ejemplo, new Set(["mal"]))).toEqual([]);
  });
});
