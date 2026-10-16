import { test, expect } from "@playwright/test";

/**
 * Aislamiento y modelo de propietario contra la base, sin navegador ni servidor.
 *
 * - Una empresa no lee ni escribe tablas directamente; solo ve lo suyo, visible y
 *   publicado, a través de ws_*.
 * - La empresa A no ve nada de la empresa B, ni pidiéndolo por id.
 * - Nadie que no sea el propietario puede hacerse dueño de la landing, crear
 *   empresas, vincular usuarios ni tocar contraseñas (auditoría SEG-01, SEG-02).
 * - created_at y owner_id no los decide el cliente (DAT-01).
 * - Un enlace público revocado deja de mostrar el documento.
 *
 * Corre SOLO contra la rama staging, con las cuentas de `npm run staging:cuentas`
 * (E2E_EMAIL, E2E_EMPRESA_*, E2E_EMPRESA_B_*). Nunca con cuentas reales.
 */
const URL_BASE = process.env.NEXT_PUBLIC_INSFORGE_URL;
const ANON = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const PROPIETARIO = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
const EMPRESA_A = { email: process.env.E2E_EMPRESA_EMAIL, password: process.env.E2E_EMPRESA_PASSWORD };
const EMPRESA_B = { email: process.env.E2E_EMPRESA_B_EMAIL, password: process.env.E2E_EMPRESA_B_PASSWORD };
const NINGUNO = "00000000-0000-0000-0000-000000000000";

test.describe.configure({ mode: "serial" });
test.skip(
  !URL_BASE || !ANON || !PROPIETARIO.email || !EMPRESA_A.email || !EMPRESA_B.email,
  "Define las cuentas de staging en .env.local (npm run staging:cuentas).",
);
test.skip(!/\.test$/.test(PROPIETARIO.email ?? ""), "Estos tests solo corren con las cuentas de prueba de staging.");

type Cliente = Awaited<ReturnType<typeof clienteNuevo>>;

async function clienteNuevo() {
  // Import dinámico: el cargador CJS de Playwright no resuelve los "exports" del SDK.
  const { createClient } = await import("@insforge/sdk");
  return createClient({ baseUrl: URL_BASE!, anonKey: ANON!, isServerMode: true });
}

async function sesion(cuenta: { email?: string; password?: string }): Promise<{ c: Cliente; uid: string }> {
  // Una sola pasada basta: no depende del dispositivo.
  test.skip(test.info().project.name !== "escritorio", "Solo en escritorio.");
  const c = await clienteNuevo();
  const { data, error } = await c.auth.signInWithPassword({ email: cuenta.email!, password: cuenta.password! });
  expect(error).toBeNull();
  return { c, uid: data!.user!.id as string };
}

/** Bloqueado = la base devolvió error o no afectó ninguna fila. */
function bloqueado(r: { error: unknown; data: unknown }) {
  return r.error !== null || (Array.isArray(r.data) && r.data.length === 0) || r.data === null;
}

const TABLAS = ["clientes", "trabajos", "trabajo_tareas", "cotizaciones", "cobros", "fichas", "briefs", "actas_entrega", "informes", "actividades", "solicitudes", "comentarios", "leads", "perfil_marca", "enlaces_publicos", "aceptaciones", "miembros"];

test("la empresa no lee tablas directamente", async () => {
  const { c } = await sesion(EMPRESA_A);
  for (const tabla of TABLAS) {
    const { data, error } = await c.database.from(tabla).select("*").limit(5);
    // Sin políticas para la empresa: o la base niega el acceso o devuelve vacío, nunca filas.
    expect(error ? [] : data, `tabla ${tabla}`).toEqual([]);
  }
});

test("la empresa no escribe tablas directamente", async () => {
  const { c } = await sesion(EMPRESA_A);
  const intentos = [
    c.database.from("comentarios").insert([{ entidad: "trabajo", entidad_id: NINGUNO, texto: "x", es_propietario: true, leido: true }]).select("id"),
    c.database.from("solicitudes").insert([{ titulo: "x" }]).select("id"),
    c.database.from("trabajos").update({ titulo: "hackeado" }).neq("id", NINGUNO).select("id"),
    c.database.from("clientes").update({ modulos: ["proyectos", "calendario", "informes", "documentos", "cotizaciones", "equipos", "solicitudes"] }).neq("id", NINGUNO).select("id"),
  ];
  for (const r of await Promise.all(intentos)) expect(bloqueado(r)).toBe(true);
});

test("lo que ve por ws_* es solo suyo, visible y sin notas internas", async () => {
  const { c } = await sesion(EMPRESA_A);
  const empresa = (await c.database.rpc("ws_mi_empresa")).data as { id: string; nombre: string } | null;
  expect(empresa?.id).toBeTruthy();
  const trabajos = ((await c.database.rpc("ws_trabajos")).data ?? []) as Record<string, unknown>[];
  for (const t of trabajos) {
    expect(t).not.toHaveProperty("notas");
    expect(t).not.toHaveProperty("monto_estimado");
    expect(t).not.toHaveProperty("visible_empresa");
  }
  const informes = ((await c.database.rpc("ws_informes")).data ?? []) as Record<string, unknown>[];
  for (const i of informes) expect(i).not.toHaveProperty("notas");
  // Funciones del panel: sin ser el propietario no devuelven nada.
  expect((await c.database.rpc("panel_resumen")).data?.empresas ?? 0).toBe(0);
  expect((await c.database.rpc("es_propietario")).data).toBe(false);
});

test("la empresa A no ve nada de la empresa B, ni pidiéndolo por id", async () => {
  const { c: duenio } = await sesion(PROPIETARIO);
  const b = await duenio.database.from("clientes").select("id").eq("slug", "empresa-b").single();
  expect(b.error).toBeNull();
  const trabajoB = await duenio.database.from("trabajos").select("id, titulo").eq("cliente_id", b.data!.id).eq("visible_empresa", true).limit(1).single();
  expect(trabajoB.error, "staging necesita un trabajo visible de la empresa B (npm run staging:cuentas)").toBeNull();

  // B sí lo ve: el trabajo existe y es visible.
  const { c: sesionB } = await sesion(EMPRESA_B);
  const deB = ((await sesionB.database.rpc("ws_trabajos")).data ?? []) as { id: string }[];
  expect(deB.map((t) => t.id)).toContain(trabajoB.data!.id);

  // A no: ni en su lista ni pidiéndolo por id.
  const { c: sesionA } = await sesion(EMPRESA_A);
  const deA = ((await sesionA.database.rpc("ws_trabajos")).data ?? []) as { id: string }[];
  expect(deA.map((t) => t.id)).not.toContain(trabajoB.data!.id);
  const porId = await sesionA.database.rpc("ws_trabajo", { p_id: trabajoB.data!.id });
  expect(porId.error !== null || porId.data === null).toBe(true);
  const comentarios = await sesionA.database.rpc("ws_comentarios", { p_entidad: "trabajo", p_id: trabajoB.data!.id });
  expect(comentarios.error !== null || ((comentarios.data ?? []) as unknown[]).length === 0).toBe(true);
});

test("una empresa no puede hacerse dueña de la landing ni crear empresas (SEG-01)", async () => {
  const { c, uid } = await sesion(EMPRESA_A);
  const perfil = await c.database
    .from("perfil_marca")
    .insert([{ owner_id: uid, nombre_comercial: "x", responsable: "x", cargo: "x", created_at: "2000-01-01" }])
    .select("id");
  expect(bloqueado(perfil)).toBe(true);
  const empresa = await c.database.from("clientes").insert([{ owner_id: uid, nombre: "x", slug: "x-e2e-ataque" }]).select("id");
  expect(bloqueado(empresa)).toBe(true);
  // La landing sigue mostrando la marca del propietario.
  const anon = await clienteNuevo();
  const landing = (await anon.database.rpc("landing_datos")).data as { marca: { nombre_comercial: string } | null } | null;
  expect(landing?.marca?.nombre_comercial).not.toBe("x");
});

test("nadie vincula al propietario ni toca su contraseña o su correo (SEG-02)", async () => {
  const { c: duenio, uid: uidPropietario } = await sesion(PROPIETARIO);
  const { c: sesionA, uid: uidA } = await sesion(EMPRESA_A);

  // Empresa A: crear una empresa vinculada al propietario, cambiarle la contraseña, leer su correo.
  const vincular = await sesionA.database.from("clientes").insert([{ owner_id: uidA, nombre: "x", slug: "x-e2e-vincular", usuario_id: uidPropietario }]).select("id");
  expect(bloqueado(vincular)).toBe(true);
  const contrasena = await sesionA.database.rpc("ws_admin_set_password", { p_usuario: uidPropietario, p_password: "contrasena-de-ataque" });
  expect(contrasena.error).not.toBeNull();
  const correo = await sesionA.database.rpc("ws_correo_usuario", { p_usuario: uidPropietario });
  expect(correo.data ?? null).toBeNull();

  // Ni el propietario puede vincularse a sí mismo (sería darle a una empresa la llave del panel).
  const b = await duenio.database.from("clientes").select("id, usuario_id").eq("slug", "empresa-b").single();
  const auto = await duenio.database.from("clientes").update({ usuario_id: uidPropietario }).eq("id", b.data!.id).select("id");
  expect(bloqueado(auto)).toBe(true);
  const sigue = await duenio.database.from("clientes").select("usuario_id").eq("id", b.data!.id).single();
  expect(sigue.data?.usuario_id).toBe(b.data!.usuario_id);
});

test("created_at y owner_id no los decide el cliente (DAT-01)", async () => {
  const { c, uid } = await sesion(PROPIETARIO);
  const { uid: uidA } = await sesion(EMPRESA_A);
  const ins = await c.database
    .from("servicios")
    .insert([{ owner_id: uid, area: "soporte", nombre: "e2e columnas de sistema", unidad: "servicio", visible_landing: false, created_at: "2000-01-01T00:00:00Z" }])
    .select("id, created_at")
    .single();
  expect(ins.error).toBeNull();
  try {
    expect(new Date(ins.data!.created_at).getFullYear()).toBeGreaterThan(2020);
    const upd = await c.database.from("servicios").update({ owner_id: uidA, created_at: "2001-01-01T00:00:00Z" }).eq("id", ins.data!.id).select("owner_id, created_at").single();
    expect(upd.data?.owner_id).toBe(uid);
    expect(upd.data?.created_at).toBe(ins.data!.created_at);
  } finally {
    await c.database.from("servicios").delete().eq("id", ins.data!.id);
  }
});

test("las aceptaciones no se pueden borrar (SEG-11)", async () => {
  const { c } = await sesion(PROPIETARIO);
  const total = await c.database.from("aceptaciones").select("id", { count: "exact", head: true });
  const borrar = await c.database.from("aceptaciones").delete().neq("id", NINGUNO).select("id");
  expect(bloqueado(borrar)).toBe(true);
  const despues = await c.database.from("aceptaciones").select("id", { count: "exact", head: true });
  expect(despues.count).toBe(total.count);
});

test("un enlace revocado deja de mostrar el documento", async () => {
  const { c } = await sesion(PROPIETARIO);
  const ficha = await c.database.from("fichas").select("id").eq("numero", "FT-2026-001").single();
  expect(ficha.error).toBeNull();
  await c.database.from("fichas").update({ publicada: true }).eq("id", ficha.data!.id);
  const enlace = await c.database.rpc("obtener_enlace", { p_tipo: "ficha", p_id: ficha.data!.id, p_renovar: true });
  expect(enlace.error).toBeNull();
  const token = enlace.data as string;

  const anon = await clienteNuevo();
  expect((await anon.database.rpc("portal_documento", { p_token: token })).data).not.toBeNull();

  await c.database.from("enlaces_publicos").update({ revocado: true }).eq("token", token);
  expect((await anon.database.rpc("portal_documento", { p_token: token })).data ?? null).toBeNull();
});

test("el DNI de quien acepta sale enmascarado fuera del panel (SEG-06)", async () => {
  // Arma su propia aceptación en SGC (empresa A): cotización enviada y aceptada desde el panel.
  const { c: duenio, uid } = await sesion(PROPIETARIO);
  const sgc = await duenio.database.from("clientes").select("id").eq("slug", "sgc").single();
  const cot = await duenio.database
    .from("cotizaciones")
    .insert([{ owner_id: uid, cliente_id: sgc.data!.id, asunto: "e2e DNI enmascarado", area: "soporte", estado: "enviada" }])
    .select("id")
    .single();
  expect(cot.error).toBeNull();
  const item = await duenio.database
    .from("cotizacion_items")
    .insert([{ owner_id: uid, cotizacion_id: cot.data!.id, descripcion: "Línea de prueba", unidad: "servicio", cantidad: 1, precio_unitario: 10000 }])
    .select("id");
  expect(item.error).toBeNull();
  const aceptar = await duenio.database.rpc("cotizacion_aceptar_panel", { p_cot: cot.data!.id, p_nombre: "Persona de Prueba", p_dni: "12345678" });
  expect(aceptar.error).toBeNull();

  // El panel (propietario) ve el DNI completo en la tabla.
  const enPanel = await duenio.database.from("aceptaciones").select("dni").eq("cotizacion_id", cot.data!.id).single();
  expect(enPanel.data?.dni).toBe("12345678");

  // La empresa lo ve enmascarado.
  const { c: sesionA } = await sesion(EMPRESA_A);
  const det = (await sesionA.database.rpc("ws_cotizacion", { p_id: cot.data!.id })).data as { aceptacion?: { dni?: string | null } | null } | null;
  expect(det?.aceptacion?.dni).toBe("****5678");

  // Limpieza: el trabajo que creó la aceptación y la cotización (su aceptación se va en cascada).
  const z = await duenio.database.from("cotizaciones").select("trabajo_id").eq("id", cot.data!.id).single();
  await duenio.database.from("cotizaciones").delete().eq("id", cot.data!.id);
  if (z.data?.trabajo_id) await duenio.database.from("trabajos").delete().eq("id", z.data.trabajo_id);
});
