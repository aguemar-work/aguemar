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

const TABLAS = ["clientes", "trabajos", "trabajo_tareas", "cotizaciones", "cobros", "fichas", "briefs", "actas_entrega", "informes", "actividades", "solicitudes", "comentarios", "leads", "perfil_marca", "enlaces_publicos", "aceptaciones", "miembros", "eventos_landing"];

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

/**
 * Cotización aceptada de prueba en SGC (empresa A). Lo aceptado ya no se borra (ADR-07),
 * así que se crea una vez y las corridas siguientes la reutilizan.
 */
async function cotizacionAceptadaDePrueba(duenio: Cliente, uid: string): Promise<string> {
  const ASUNTO = "e2e cotización aceptada";
  const existente = await duenio.database.from("cotizaciones").select("id").eq("asunto", ASUNTO).eq("estado", "aceptada").limit(1).maybeSingle();
  if (existente.data) return existente.data.id as string;

  const sgc = await duenio.database.from("clientes").select("id").eq("slug", "sgc").single();
  const cot = await duenio.database
    .from("cotizaciones")
    .insert([{ owner_id: uid, cliente_id: sgc.data!.id, asunto: ASUNTO, area: "soporte", estado: "enviada" }])
    .select("id")
    .single();
  expect(cot.error).toBeNull();
  const item = await duenio.database
    .from("cotizacion_items")
    .insert([{ owner_id: uid, cotizacion_id: cot.data!.id, descripcion: "Línea de prueba", unidad: "servicio", cantidad: 1, precio_unitario: 10000 }])
    .select("id");
  expect(item.error).toBeNull();
  // Aceptar pasa por cotizacion_aceptar_core: prueba que el núcleo sí registra la aceptación.
  const aceptar = await duenio.database.rpc("cotizacion_aceptar_panel", { p_cot: cot.data!.id, p_nombre: "Persona de Prueba", p_dni: "12345678" });
  expect(aceptar.error).toBeNull();
  return cot.data!.id as string;
}

test("el DNI de quien acepta sale enmascarado fuera del panel (SEG-06)", async () => {
  const { c: duenio, uid } = await sesion(PROPIETARIO);
  const cotId = await cotizacionAceptadaDePrueba(duenio, uid);

  // El panel (propietario) ve el DNI completo en la tabla.
  const enPanel = await duenio.database.from("aceptaciones").select("dni").eq("cotizacion_id", cotId).limit(1).single();
  expect(enPanel.data?.dni).toBe("12345678");

  // La empresa lo ve enmascarado.
  const { c: sesionA } = await sesion(EMPRESA_A);
  const det = (await sesionA.database.rpc("ws_cotizacion", { p_id: cotId })).data as { aceptacion?: { dni?: string | null } | null } | null;
  expect(det?.aceptacion?.dni).toBe("****5678");
});

test("una cotización aceptada no cambia: ni su contenido, ni sus líneas, ni Mi marca en su documento (ADR-07)", async () => {
  const { c: duenio, uid } = await sesion(PROPIETARIO);
  const cotId = await cotizacionAceptadaDePrueba(duenio, uid);

  // Queda la copia con su huella.
  const acep = await duenio.database.from("aceptaciones").select("documento, huella").eq("cotizacion_id", cotId).limit(1).single();
  expect(acep.data?.documento).not.toBeNull();
  expect(acep.data?.huella).toMatch(/^[0-9a-f]{64}$/);

  // Ni el propietario edita, agrega líneas, borra líneas o borra la cotización.
  expect(bloqueado(await duenio.database.from("cotizaciones").update({ asunto: "cambiada" }).eq("id", cotId).select("id"))).toBe(true);
  expect(bloqueado(await duenio.database.from("cotizaciones").update({ estado: "enviada" }).eq("id", cotId).select("id"))).toBe(true);
  expect(
    bloqueado(
      await duenio.database
        .from("cotizacion_items")
        .insert([{ owner_id: uid, cotizacion_id: cotId, descripcion: "Línea colada", unidad: "servicio", cantidad: 1, precio_unitario: 1 }])
        .select("id"),
    ),
  ).toBe(true);
  expect(bloqueado(await duenio.database.from("cotizacion_items").delete().eq("cotizacion_id", cotId).select("id"))).toBe(true);
  expect(bloqueado(await duenio.database.from("cotizaciones").delete().eq("id", cotId).select("id"))).toBe(true);

  // Cambiar Mi marca no cambia lo que la empresa aceptó.
  const { c: sesionA } = await sesion(EMPRESA_A);
  type Doc = { asunto: string; marca: { cargo: string } } | null;
  const antes = (await sesionA.database.rpc("ws_cotizacion", { p_id: cotId })).data as Doc;
  expect(antes?.asunto).toBe("e2e cotización aceptada");
  const marca = await duenio.database.from("perfil_marca").select("id, cargo").eq("owner_id", uid).single();
  try {
    const cambio = await duenio.database.from("perfil_marca").update({ cargo: `${marca.data!.cargo} (e2e)` }).eq("id", marca.data!.id).select("cargo").single();
    expect(cambio.data?.cargo).toBe(`${marca.data!.cargo} (e2e)`);
    const despues = (await sesionA.database.rpc("ws_cotizacion", { p_id: cotId })).data as Doc;
    expect(despues?.marca.cargo).toBe(antes?.marca.cargo);
  } finally {
    await duenio.database.from("perfil_marca").update({ cargo: marca.data!.cargo }).eq("id", marca.data!.id);
  }
});

test("una cotización solo se acepta registrando quién acepta, no cambiando su estado (ADR-07)", async () => {
  const { c: duenio, uid } = await sesion(PROPIETARIO);
  const sgc = await duenio.database.from("clientes").select("id").eq("slug", "sgc").single();
  const creada = await duenio.database
    .from("cotizaciones")
    .insert([{ owner_id: uid, cliente_id: sgc.data!.id, asunto: "e2e aceptada a mano", area: "soporte", estado: "aceptada" }])
    .select("id");
  expect(bloqueado(creada)).toBe(true);

  const cot = await duenio.database
    .from("cotizaciones")
    .insert([{ owner_id: uid, cliente_id: sgc.data!.id, asunto: "e2e estado a mano", area: "soporte", estado: "enviada" }])
    .select("id")
    .single();
  expect(cot.error).toBeNull();
  try {
    expect(bloqueado(await duenio.database.from("cotizaciones").update({ estado: "aceptada" }).eq("id", cot.data!.id).select("id"))).toBe(true);
  } finally {
    await duenio.database.from("cotizaciones").delete().eq("id", cot.data!.id);
  }
});

test("un acta aceptada no cambia y su aceptación no se escribe a mano (ADR-07)", async () => {
  const { c: duenio, uid } = await sesion(PROPIETARIO);
  const sgc = await duenio.database.from("clientes").select("id").eq("slug", "sgc").single();
  const TITULO = "e2e acta aceptada";

  let actaId = (await duenio.database.from("actas_entrega").select("id").eq("titulo", TITULO).not("aceptada_en", "is", null).limit(1).maybeSingle()).data?.id as
    | string
    | undefined;
  if (!actaId) {
    const acta = await duenio.database
      .from("actas_entrega")
      .insert([{ owner_id: uid, cliente_id: sgc.data!.id, titulo: TITULO, area: "soporte", publicada: true }])
      .select("id")
      .single();
    expect(acta.error).toBeNull();
    actaId = acta.data!.id as string;
    expect((await duenio.database.rpc("acta_aceptar_panel", { p_id: actaId, p_nombre: "Persona de Prueba", p_dni: "12345678" })).error).toBeNull();
  }

  const fila = await duenio.database.from("actas_entrega").select("aceptada_documento, aceptada_huella").eq("id", actaId).single();
  expect(fila.data?.aceptada_documento).not.toBeNull();
  expect(fila.data?.aceptada_huella).toMatch(/^[0-9a-f]{64}$/);

  expect(bloqueado(await duenio.database.from("actas_entrega").update({ titulo: "cambiada" }).eq("id", actaId).select("id"))).toBe(true);
  expect(bloqueado(await duenio.database.from("actas_entrega").update({ aceptada_nombre: "Otra persona" }).eq("id", actaId).select("id"))).toBe(true);
  expect(bloqueado(await duenio.database.from("actas_entrega").delete().eq("id", actaId).select("id"))).toBe(true);

  // Un acta sin aceptar tampoco se "acepta" escribiendo las columnas.
  const otra = await duenio.database
    .from("actas_entrega")
    .insert([{ owner_id: uid, cliente_id: sgc.data!.id, titulo: "e2e acta sin aceptar", area: "soporte" }])
    .select("id")
    .single();
  expect(otra.error).toBeNull();
  try {
    const forzar = await duenio.database
      .from("actas_entrega")
      .update({ aceptada_en: new Date().toISOString(), aceptada_nombre: "Nadie" })
      .eq("id", otra.data!.id)
      .select("id");
    expect(bloqueado(forzar)).toBe(true);
  } finally {
    await duenio.database.from("actas_entrega").delete().eq("id", otra.data!.id);
  }
});


test("el último ingreso solo marca la empresa propia, una vez al día (HU 2.1)", async () => {
  const { c: duenio } = await sesion(PROPIETARIO);
  const ids = await duenio.database.from("clientes").select("id, slug").in("slug", ["empresa-b"]);
  const { c: sesionA } = await sesion(EMPRESA_A);
  const a = (await sesionA.database.rpc("ws_mi_empresa")).data as { id: string } | null;
  const idB = (ids.data as { id: string }[])[0].id;
  expect((await duenio.database.from("clientes").update({ ultimo_ingreso: null }).in("id", [a!.id, idB]).select("id")).error).toBeNull();

  expect((await sesionA.database.rpc("ws_registrar_ingreso")).data).toBe(true);
  expect((await sesionA.database.rpc("ws_registrar_ingreso")).data).toBe(false);
  const fila = (await duenio.database.from("clientes").select("id, ultimo_ingreso").in("id", [a!.id, idB])).data as { id: string; ultimo_ingreso: string | null }[];
  expect(fila.find((f) => f.id === a!.id)?.ultimo_ingreso).not.toBeNull();
  expect(fila.find((f) => f.id === idB)?.ultimo_ingreso).toBeNull();
  expect(((await sesionA.database.rpc("ws_mi_empresa")).data as { ultimo_ingreso: string | null }).ultimo_ingreso).not.toBeNull();

  // Sin sesión no se registra nada.
  const anon = await clienteNuevo();
  expect((await anon.database.rpc("ws_registrar_ingreso")).error).not.toBeNull();
});

test("los contadores de la landing solo se suman por registrar_evento y no se leen sin ser propietario (HU 1.1)", async () => {
  const anon = await clienteNuevo();
  expect((await anon.database.rpc("registrar_evento", { p_evento: "otra_cosa", p_origen: "google" })).error).not.toBeNull();
  expect((await anon.database.rpc("registrar_evento", { p_evento: "whatsapp_click", p_origen: "inventado" })).error).toBeNull();
  expect(bloqueado(await anon.database.from("eventos_landing").select("*").limit(1))).toBe(true);
  expect(bloqueado(await anon.database.from("eventos_landing").insert([{ dia: "2026-01-01", evento: "whatsapp_click", origen: "google", total: 9999 }]).select("id"))).toBe(true);

  // El origen inventado quedó como "otro"; el propietario sí lo lee y no puede inflarlo a mano.
  const { c: duenio } = await sesion(PROPIETARIO);
  const filas = (await duenio.database.from("eventos_landing").select("id, origen, total").eq("evento", "whatsapp_click").eq("origen", "otro")).data as { id: string }[];
  expect(filas.length).toBeGreaterThan(0);
  expect(bloqueado(await duenio.database.from("eventos_landing").update({ total: 9999 }).eq("id", filas[0].id).select("id"))).toBe(true);
});

test("crear_lead guarda el origen saneado y nunca falla por él (HU 1.3)", async () => {
  const anon = await clienteNuevo();
  const nombre = `E2E origen ${Date.now()}`;
  const r = await anon.database.rpc("crear_lead", {
    p_nombre: nombre, p_telefono: "999999999", p_correo: "", p_servicio: "", p_mensaje: "Prueba de origen del lead",
    p_origen: { origen: "inventado", referente: "evil.com/<script>", utm: { source: "x".repeat(300), medium: "cpc" } },
  });
  expect(r.error).toBeNull();
  const { c: duenio } = await sesion(PROPIETARIO);
  const lead = (await duenio.database.from("leads").select("id, origen, referente, utm").eq("nombre", nombre).single()).data as {
    id: string; origen: string; referente: string | null; utm: { source: string; medium: string };
  };
  expect(lead.origen).toBe("otro");
  expect(lead.referente).toBeNull();
  expect(lead.utm.source).toHaveLength(80);
  expect(lead.utm.medium).toBe("cpc");
  await duenio.database.from("leads").delete().eq("id", lead.id);
});
