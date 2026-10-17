import { test, expect } from "@playwright/test";

/**
 * Colaboradores e invitaciones contra la base (Fase 14), sin navegador.
 *
 * - El colaborador solo ve lo de sus empresas asignadas (SGC en staging), nunca
 *   montos, notas internas, cotizaciones, cobros, leads, servicios ni marca.
 * - Lo que crea queda a nombre del propietario y con su numeración.
 * - Publica enlaces de sus documentos, nunca de cotizaciones.
 * - Una invitación solo la acepta el correo invitado, una sola vez.
 *
 * Corre SOLO contra staging con las cuentas de `npm run staging:cuentas`.
 */
const URL_BASE = process.env.NEXT_PUBLIC_INSFORGE_URL;
const ANON = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const PROPIETARIO = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
const EMPRESA_A = { email: process.env.E2E_EMPRESA_EMAIL, password: process.env.E2E_EMPRESA_PASSWORD };
const COLABORADOR = { email: process.env.E2E_COLABORADOR_EMAIL, password: process.env.E2E_COLABORADOR_PASSWORD };

test.describe.configure({ mode: "serial" });
test.skip(!URL_BASE || !ANON || !PROPIETARIO.email || !EMPRESA_A.email || !COLABORADOR.email, "Define las cuentas de staging (npm run staging:cuentas).");
test.skip(!/\.test$/.test(PROPIETARIO.email ?? ""), "Solo con las cuentas de prueba de staging.");

type Cliente = Awaited<ReturnType<typeof clienteNuevo>>;

async function clienteNuevo() {
  const { createClient } = await import("@insforge/sdk");
  return createClient({ baseUrl: URL_BASE!, anonKey: ANON!, isServerMode: true });
}

async function sesion(cuenta: { email?: string; password?: string }): Promise<{ c: Cliente; uid: string }> {
  test.skip(test.info().project.name !== "escritorio", "Solo en escritorio.");
  const c = await clienteNuevo();
  const { data, error } = await c.auth.signInWithPassword({ email: cuenta.email!, password: cuenta.password! });
  expect(error).toBeNull();
  return { c, uid: data!.user!.id as string };
}

function bloqueado(r: { error: unknown; data: unknown }) {
  return r.error !== null || (Array.isArray(r.data) && r.data.length === 0) || r.data === null;
}

async function ids() {
  const { c, uid } = await sesion(PROPIETARIO);
  const sgc = await c.database.from("clientes").select("id").eq("slug", "sgc").single();
  const b = await c.database.from("clientes").select("id").eq("slug", "empresa-b").single();
  const tSgc = await c.database.from("trabajos").select("id").eq("cliente_id", sgc.data!.id).eq("titulo", "Mantenimiento SGC (prueba)").single();
  const tB = await c.database.from("trabajos").select("id").eq("cliente_id", b.data!.id).limit(1).single();
  expect(tSgc.error, "staging necesita el trabajo 'Mantenimiento SGC (prueba)' (npm run staging:cuentas)").toBeNull();
  return { duenio: c, uidDuenio: uid, sgc: sgc.data!.id as string, b: b.data!.id as string, trabajoSgc: tSgc.data!.id as string, trabajoB: tB.data!.id as string };
}

test("el colaborador tiene su rol y no es propietario", async () => {
  const { c } = await sesion(COLABORADOR);
  expect((await c.database.rpc("mi_rol")).data).toBe("colaborador");
  expect((await c.database.rpc("es_propietario")).data).toBe(false);
});

test("no lee dinero, leads, marca ni las tablas de trabajos y empresas", async () => {
  const { c } = await sesion(COLABORADOR);
  for (const tabla of ["trabajos", "clientes", "cotizaciones", "cotizacion_items", "cobros", "aceptaciones", "leads", "servicios", "perfil_marca", "invitaciones", "solicitudes", "miembros", "miembro_empresas"]) {
    const { data, error } = await c.database.from(tabla).select("*").limit(5);
    expect(error ? [] : data, `tabla ${tabla}`).toEqual([]);
  }
  expect((await c.database.rpc("equipo_listar")).data ?? []).toEqual([]);
});

test("por las vistas ve solo sus empresas, sin montos ni notas", async () => {
  const { sgc, b } = await ids();
  const { c } = await sesion(COLABORADOR);
  const empresas = ((await c.database.from("clientes_equipo").select("id, notas")).data ?? []) as { id: string; notas: string | null }[];
  expect(empresas.map((e) => e.id)).toEqual([sgc]);
  expect(empresas.every((e) => e.notas === null)).toBe(true);
  const trabajos = ((await c.database.from("trabajos_equipo").select("cliente_id, monto_estimado, moneda, notas")).data ?? []) as Record<string, unknown>[];
  expect(trabajos.length).toBeGreaterThan(0);
  for (const t of trabajos) {
    expect(t.cliente_id).toBe(sgc);
    expect(t.cliente_id).not.toBe(b);
    expect(t.monto_estimado).toBeNull();
    expect(t.moneda).toBeNull();
    expect(t.notas).toBeNull();
  }
});

test("trabaja tareas de sus empresas, no de otras", async () => {
  const { trabajoSgc, trabajoB } = await ids();
  const { c, uid } = await sesion(COLABORADOR);
  const propia = await c.database.from("trabajo_tareas").insert([{ owner_id: uid, trabajo_id: trabajoSgc, titulo: "e2e tarea colaborador" }]).select("id, owner_id").single();
  expect(propia.error).toBeNull();
  const ajena = await c.database.from("trabajo_tareas").insert([{ owner_id: uid, trabajo_id: trabajoB, titulo: "e2e tarea ajena" }]).select("id");
  expect(bloqueado(ajena)).toBe(true);
  const hecha = await c.database.from("trabajo_tareas").update({ hecha: true }).eq("id", propia.data!.id).select("hecha").single();
  expect(hecha.data?.hecha).toBe(true);
  // No puede tocar el trabajo en sí.
  const editarTrabajo = await c.database.from("trabajos").update({ titulo: "x" }).eq("id", trabajoSgc).select("id");
  expect(bloqueado(editarTrabajo)).toBe(true);
  expect((await c.database.from("trabajo_tareas").delete().eq("id", propia.data!.id).select("id")).error).toBeNull();
});

test("lo que crea queda a nombre del propietario y con su numeración", async () => {
  const { duenio, uidDuenio, sgc } = await ids();
  const { c, uid } = await sesion(COLABORADOR);
  const ficha = await c.database
    .from("fichas")
    .insert([{ owner_id: uid, cliente_id: sgc, fecha: "2026-10-16", tipo_servicio: "Mantenimiento correctivo", modalidad: "remota", titular: "e2e ficha del colaborador" }])
    .select("id, numero, owner_id")
    .single();
  expect(ficha.error).toBeNull();
  expect(ficha.data!.owner_id).toBe(uidDuenio);
  expect(ficha.data!.numero).toMatch(/^FT-2026-\d{3}$/);
  // El propietario la ve en su panel.
  expect((await duenio.database.from("fichas").select("id").eq("id", ficha.data!.id).single()).error).toBeNull();

  // Publica y genera el enlace de su ficha; una cotización no.
  await c.database.from("fichas").update({ publicada: true }).eq("id", ficha.data!.id);
  const enlace = await c.database.rpc("obtener_enlace", { p_tipo: "ficha", p_id: ficha.data!.id, p_renovar: false });
  expect(enlace.error).toBeNull();
  const cot = await duenio.database.from("cotizaciones").select("id").limit(1).maybeSingle();
  if (cot.data) {
    const enlaceCot = await c.database.rpc("obtener_enlace", { p_tipo: "cotizacion", p_id: cot.data.id, p_renovar: false });
    expect(enlaceCot.error).not.toBeNull();
  }
  // Limpieza (el colaborador no borra fichas: lo hace el propietario).
  await duenio.database.from("enlaces_publicos").delete().eq("tipo", "ficha").eq("documento_id", ficha.data!.id);
  await duenio.database.from("fichas").delete().eq("id", ficha.data!.id);
});

test("un comentario no se cuela en otra empresa", async () => {
  const { sgc, trabajoSgc, trabajoB, duenio } = await ids();
  const { c, uid } = await sesion(COLABORADOR);
  const ok = await c.database
    .from("comentarios")
    .insert([{ owner_id: uid, cliente_id: sgc, entidad: "trabajo", entidad_id: trabajoSgc, autor_uid: uid, es_propietario: true, texto: "e2e comentario del equipo", leido: true }])
    .select("id")
    .single();
  expect(ok.error).toBeNull();
  const colado = await c.database
    .from("comentarios")
    .insert([{ owner_id: uid, cliente_id: sgc, entidad: "trabajo", entidad_id: trabajoB, autor_uid: uid, es_propietario: true, texto: "e2e colado", leido: true }])
    .select("id");
  expect(bloqueado(colado)).toBe(true);
  await duenio.database.from("comentarios").delete().eq("id", ok.data!.id);
});

test("su inicio resume solo sus empresas", async () => {
  const { c } = await sesion(COLABORADOR);
  const r = (await c.database.rpc("equipo_resumen")).data as { empresas: { slug: string }[]; trabajos: unknown[] } | null;
  expect(r?.empresas.map((e) => e.slug)).toEqual(["sgc"]);
  // A una empresa no le sirve.
  const { c: a } = await sesion(EMPRESA_A);
  const deA = (await a.database.rpc("equipo_resumen")).data as { empresas: unknown[] } | null;
  expect(deA?.empresas ?? []).toEqual([]);
});

test("una invitación solo la acepta el correo invitado", async () => {
  const { duenio, uidDuenio } = await ids();
  const inv = await duenio.database
    .from("invitaciones")
    .insert([{ owner_id: uidDuenio, tipo: "colaborador", correo: "nadie-e2e@staging.aguemar.test", nombre: "e2e" }])
    .select("id, token")
    .single();
  expect(inv.error).toBeNull();
  try {
    const anon = await clienteNuevo();
    const vista = (await anon.database.rpc("invitacion_ver", { p_token: inv.data!.token })).data as { estado: string; tipo: string } | null;
    expect(vista?.estado).toBe("vigente");
    const { c: a } = await sesion(EMPRESA_A);
    const robo = await a.database.rpc("invitacion_aceptar", { p_token: inv.data!.token });
    expect(robo.error).not.toBeNull();
    expect((await a.database.rpc("mi_rol")).data ?? null).toBeNull();
    // Renovar cambia el token y el anterior deja de existir.
    const nuevo = await duenio.database.rpc("invitacion_renovar", { p_id: inv.data!.id });
    expect(nuevo.data).not.toBe(inv.data!.token);
    expect((await anon.database.rpc("invitacion_ver", { p_token: inv.data!.token })).data ?? null).toBeNull();
  } finally {
    await duenio.database.from("invitaciones").delete().eq("id", inv.data!.id);
  }
});

test("una empresa no puede crear invitaciones ni tocar el equipo", async () => {
  const { c, uid } = await sesion(EMPRESA_A);
  const crear = await c.database.from("invitaciones").insert([{ owner_id: uid, tipo: "colaborador", correo: "x@staging.aguemar.test" }]).select("id");
  expect(bloqueado(crear)).toBe(true);
  const { c: colab, uid: uidColab } = await sesion(COLABORADOR);
  const actualizar = await c.database.rpc("equipo_actualizar", { p_usuario: uidColab, p_activo: false, p_empresas: [] });
  expect(actualizar.error).not.toBeNull();
  // El colaborador tampoco se da empresas a sí mismo.
  const auto = await colab.database.rpc("equipo_actualizar", { p_usuario: uidColab, p_activo: true, p_empresas: [] });
  expect(auto.error).not.toBeNull();
});
