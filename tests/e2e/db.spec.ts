import { test, expect } from "@playwright/test";
import fixtureTotales from "../fixtures/cotizaciones.json";

/**
 * Lógica crítica que vive en Postgres, probada con sus casos límite contra la base (QA-001), sin
 * navegador ni servidor: aceptación doble, numeración concurrente, reparto FIFO de cobros,
 * recordatorios, invitaciones usadas o vencidas, módulo inactivo y empresa inactiva.
 *
 * Corre SOLO contra la rama staging, con las cuentas de `npm run staging:cuentas`. Lo aceptado no se
 * borra (ADR-07), así que las pruebas trabajan con dos empresas fijas (`e2e-db-deuda` y
 * `e2e-db-modulos`) que se crean la primera vez y se reutilizan; lo demás lo borran al terminar.
 * Las cuentas de Auth de prueba tampoco se pueden borrar por la API: son fijas y derivan su
 * contraseña de E2E_PASSWORD.
 */
const URL_BASE = process.env.NEXT_PUBLIC_INSFORGE_URL;
const ANON = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const PROPIETARIO = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
const CRON_SECRET = process.env.CRON_SECRET;

test.describe.configure({ mode: "serial" });
test.skip(!URL_BASE || !ANON || !PROPIETARIO.email || !PROPIETARIO.password, "Define las cuentas de staging en .env.local (npm run staging:cuentas).");
test.skip(!/\.test$/.test(PROPIETARIO.email ?? ""), "Estos tests solo corren con las cuentas de prueba de staging.");

type Cliente = Awaited<ReturnType<typeof clienteNuevo>>;

async function clienteNuevo() {
  // Import dinámico: el cargador CJS de Playwright no resuelve los "exports" del SDK.
  const { createClient } = await import("@insforge/sdk");
  return createClient({ baseUrl: URL_BASE!, anonKey: ANON!, isServerMode: true });
}

async function propietario(): Promise<{ c: Cliente; uid: string }> {
  test.skip(test.info().project.name !== "escritorio", "Solo en escritorio.");
  const c = await clienteNuevo();
  const { data, error } = await c.auth.signInWithPassword({ email: PROPIETARIO.email!, password: PROPIETARIO.password! });
  expect(error).toBeNull();
  return { c, uid: data!.user!.id as string };
}

/** Cuenta de prueba fija: se registra la primera vez y después solo se entra. La contraseña deriva de E2E_PASSWORD. */
async function cuentaFija(correo: string): Promise<Cliente> {
  const password = `${PROPIETARIO.password}-Db1`;
  const c = await clienteNuevo();
  const alta = await c.auth.signUp({ email: correo, password, name: "e2e" });
  if (alta.error) expect(String(alta.error.message ?? ""), "alta de la cuenta de prueba").toMatch(/exist|registered|duplicate/i);
  const ses = await c.auth.signInWithPassword({ email: correo, password });
  expect(ses.error).toBeNull();
  return c;
}

interface EmpresaFija {
  id: string;
  usuario_id: string | null;
}

/** Empresa de prueba fija (se crea una vez y se reutiliza). */
async function empresaFija(duenio: Cliente, uid: string, slug: string, numDoc: string): Promise<EmpresaFija> {
  const existente = await duenio.database.from("clientes").select("id, usuario_id").eq("slug", slug).maybeSingle();
  if (existente.data) return existente.data as EmpresaFija;
  const ins = await duenio.database
    .from("clientes")
    .insert([{ owner_id: uid, nombre: `E2E ${slug}`, tipo_doc: "DNI", num_doc: numDoc, slug, correo: `${slug}@staging.aguemar.test` }])
    .select("id, usuario_id")
    .single();
  expect(ins.error).toBeNull();
  return ins.data as EmpresaFija;
}

/** Crea una cotización `enviada` con una línea y devuelve su id. Aceptarla es otro paso. */
async function cotizacion(duenio: Cliente, uid: string, clienteId: string, asunto: string, extra: Record<string, unknown> = {}): Promise<string> {
  const cot = await duenio.database
    .from("cotizaciones")
    .insert([{ owner_id: uid, cliente_id: clienteId, asunto, area: "soporte", estado: "enviada", recordar_pago: false, ...extra }])
    .select("id")
    .single();
  expect(cot.error).toBeNull();
  const item = await duenio.database
    .from("cotizacion_items")
    .insert([{ owner_id: uid, cotizacion_id: cot.data!.id, descripcion: "Línea de prueba", unidad: "servicio", cantidad: 1, precio_unitario: 10000 }])
    .select("id");
  expect(item.error).toBeNull();
  return cot.data!.id as string;
}

const aceptar = (duenio: Cliente, id: string, nombre = "Persona de Prueba") => duenio.database.rpc("cotizacion_aceptar_panel", { p_cot: id, p_nombre: nombre, p_dni: "12345678" });

test("dos aceptaciones a la vez de la misma cotización: una acepta, la otra la reconoce, un solo trabajo", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-modulos", "90000002");
  const asunto = `E2E aceptación doble ${Date.now()}`;
  const id = await cotizacion(duenio, uid, empresa.id, asunto);

  const [r1, r2] = await Promise.all([aceptar(duenio, id, "Persona Uno"), aceptar(duenio, id, "Persona Dos")]);
  expect(r1.error).toBeNull();
  expect(r2.error).toBeNull();
  const ya = [r1, r2].map((r) => (r.data as { ya_aceptada: boolean }).ya_aceptada).sort();
  expect(ya, "una la acepta y la otra encuentra que ya estaba aceptada").toEqual([false, true]);

  const aceptaciones = await duenio.database.from("aceptaciones").select("id").eq("cotizacion_id", id);
  expect(aceptaciones.data).toHaveLength(1);
  const trabajos = await duenio.database.from("trabajos").select("id").eq("cliente_id", empresa.id).eq("titulo", asunto);
  expect(trabajos.data).toHaveLength(1);
  // Las dos respuestas apuntan al mismo trabajo.
  expect((r1.data as { trabajo_id: string }).trabajo_id).toBe((r2.data as { trabajo_id: string }).trabajo_id);
});

test("diez fichas creadas a la vez reciben diez números distintos", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-modulos", "90000002");
  const marca = `E2E numeración ${Date.now()}`;
  try {
    const altas = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        duenio.database.from("fichas").insert([{ owner_id: uid, cliente_id: empresa.id, titular: `${marca} ${i}` }]).select("numero").single(),
      ),
    );
    for (const a of altas) expect(a.error).toBeNull();
    const numeros = altas.map((a) => (a.data as { numero: string }).numero);
    for (const n of numeros) expect(n).toMatch(/^FT-\d{4}-\d{3,}$/);
    expect(new Set(numeros).size, "ningún número repetido").toBe(10);
  } finally {
    await duenio.database.from("fichas").delete().like("titular", `${marca}%`);
  }
});

/** Cotización aceptada fija: se crea y acepta la primera vez; las corridas siguientes la reutilizan. */
async function cotizacionAceptadaFija(duenio: Cliente, uid: string, clienteId: string, asunto: string, plazo: number): Promise<{ id: string; total: number }> {
  const existente = await duenio.database.from("cotizaciones").select("id, estado, total").eq("cliente_id", clienteId).eq("asunto", asunto).maybeSingle();
  let id = existente.data?.id as string | undefined;
  if (!id) id = await cotizacion(duenio, uid, clienteId, asunto, { plazo_pago_dias: plazo });
  if (existente.data?.estado !== "aceptada") expect((await aceptar(duenio, id)).error).toBeNull();
  const fila = await duenio.database.from("cotizaciones").select("id, total").eq("id", id).single();
  return fila.data as { id: string; total: number };
}

test("un cobro suelto paga primero la cotización que vence antes (FIFO) y el exceso no inventa deuda", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-deuda", "90000001");

  const a = await cotizacionAceptadaFija(duenio, uid, empresa.id, "E2E deuda A (vence antes)", 5);
  const b = await cotizacionAceptadaFija(duenio, uid, empresa.id, "E2E deuda B (vence después)", 30);
  expect(a.total).toBeGreaterThan(1000);

  const pendientes = async () => {
    const r = await duenio.database.rpc("deudas_cotizacion", { p_cliente: empresa.id });
    expect(r.error).toBeNull();
    const filas = (r.data as { cotizacion_id: string; pendiente: number; vence_pago: string }[]).filter((f) => [a.id, b.id].includes(f.cotizacion_id));
    return { a: filas.find((f) => f.cotizacion_id === a.id)!, b: filas.find((f) => f.cotizacion_id === b.id)! };
  };
  const cobrar = async (monto: number) => {
    const k = await duenio.database.from("cobros").insert([{ owner_id: uid, cliente_id: empresa.id, monto, moneda: "PEN" }]).select("id").single();
    expect(k.error).toBeNull();
    return k.data!.id as string;
  };

  // Sin cobros: cada una debe su total, y A vence antes que B.
  const base = await pendientes();
  expect(base.a.pendiente).toBe(a.total);
  expect(base.b.pendiente).toBe(b.total);
  expect(base.a.vence_pago < base.b.vence_pago).toBe(true);

  // Un cobro de "A + 1 000" céntimos paga A entera y 1 000 de B, aunque no esté ligado a ninguna.
  const parcial = await cobrar(a.total + 1000);
  try {
    const r = await pendientes();
    expect(r.a.pendiente, "A se paga primero").toBe(0);
    expect(r.b.pendiente).toBe(b.total - 1000);
  } finally {
    await duenio.database.from("cobros").delete().eq("id", parcial);
  }

  // Un cobro mayor que todo lo pendiente deja las dos en cero: el exceso no crea saldo negativo.
  const exceso = await cobrar(a.total + b.total + 5000);
  try {
    const r = await pendientes();
    expect(r.a.pendiente).toBe(0);
    expect(r.b.pendiente).toBe(0);
  } finally {
    await duenio.database.from("cobros").delete().eq("id", exceso);
  }

  // Borrados los cobros, todo vuelve a deberse.
  const final = await pendientes();
  expect([final.a.pendiente, final.b.pendiente]).toEqual([a.total, b.total]);
});

test("el pendiente es el mismo en el panel, el workspace y el portal (T-28)", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-deuda", "90000001");
  const correo = "e2e-db-deuda@staging.aguemar.test";
  const cuenta = await cuentaFija(correo);
  if (!empresa.usuario_id) {
    const inv = await duenio.database.from("invitaciones").insert([{ owner_id: uid, tipo: "empresa", correo, cliente_id: empresa.id }]).select("id, token").single();
    expect(inv.error).toBeNull();
    expect((await cuenta.database.rpc("invitacion_aceptar", { p_token: inv.data!.token })).error).toBeNull();
  }
  await duenio.database.from("clientes").update({ modulos: ["cotizaciones"], activa: true }).eq("id", empresa.id);
  const a = await cotizacionAceptadaFija(duenio, uid, empresa.id, "E2E deuda A (vence antes)", 5);
  const b = await cotizacionAceptadaFija(duenio, uid, empresa.id, "E2E deuda B (vence después)", 30);

  const anonimo = await clienteNuevo();
  const token = async (id: string) => {
    const r = await duenio.database.rpc("obtener_enlace", { p_tipo: "cotizacion", p_id: id });
    expect(r.error).toBeNull();
    return r.data as string;
  };
  const tokenA = await token(a.id);
  const tokenB = await token(b.id);

  /** Lo que dice cada superficie de una cotización: [deudas_cotizacion, panel, workspace, portal]. */
  const lecturas = async (id: string, tk: string) => {
    const deudas = await duenio.database.rpc("deudas_cotizacion", { p_cliente: empresa.id });
    expect(deudas.error).toBeNull();
    const d = (deudas.data as { cotizacion_id: string; pendiente: number; vence_pago: string }[]).find((f) => f.cotizacion_id === id)!;
    const panel = (await duenio.database.rpc("cotizacion_panel", { p_id: id })).data as { pendiente: number; vence_pago: string };
    const ws = (await cuenta.database.rpc("ws_cotizacion", { p_id: id })).data as { pendiente: number; vence_pago: string };
    const portal = (await anonimo.database.rpc("portal_documento", { p_token: tk })).data as { documento: { pendiente: number; vence_pago: string } };
    return { d, panel, ws, portal: portal.documento };
  };
  const igual = (l: Awaited<ReturnType<typeof lecturas>>, pendiente: number, nombre: string) => {
    for (const [donde, v] of Object.entries({ deudas: l.d, panel: l.panel, workspace: l.ws, portal: l.portal })) {
      expect(v.pendiente, `${nombre}: pendiente en ${donde}`).toBe(pendiente);
      expect(v.vence_pago, `${nombre}: vence_pago en ${donde}`).toBe(l.d.vence_pago);
    }
  };

  // Un cobro suelto de "A + 1 000": A queda pagada y B debe su total menos 1 000, vea quien lo vea.
  const k = await duenio.database.from("cobros").insert([{ owner_id: uid, cliente_id: empresa.id, monto: a.total + 1000, moneda: "PEN" }]).select("id").single();
  expect(k.error).toBeNull();
  try {
    igual(await lecturas(a.id, tokenA), 0, "A");
    igual(await lecturas(b.id, tokenB), b.total - 1000, "B");
    const resumen = (await cuenta.database.rpc("ws_cotizaciones")).data as { total_pendiente: number };
    expect(resumen.total_pendiente, "suma del workspace").toBe(b.total - 1000);
  } finally {
    await duenio.database.from("cobros").delete().eq("id", k.data!.id);
  }
  igual(await lecturas(a.id, tokenA), a.total, "A sin cobros");
});

test("la cotización enviada se congela, editarla la devuelve a borrador (v+1) y solo se acepta la copia enviada (T-29)", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-modulos", "90000002");
  const anonimo = await clienteNuevo();
  const asunto = `E2E versión ${Date.now()}`;
  const id = await cotizacion(duenio, uid, empresa.id, asunto, { estado: "borrador" });

  const leer = async () => {
    const r = await duenio.database.from("cotizaciones").select("estado, version, enviada_documento, enviada_huella").eq("id", id).single();
    expect(r.error).toBeNull();
    return r.data as { estado: string; version: number; enviada_documento: { asunto: string } | null; enviada_huella: string | null };
  };
  const enviar = async () => expect((await duenio.database.from("cotizaciones").update({ estado: "enviada", enviada_en: new Date().toISOString() }).eq("id", id)).error).toBeNull();

  // Borrador: sin copia. Al enviar se congela con su huella.
  expect((await leer()).enviada_documento).toBeNull();
  await enviar();
  const v1 = await leer();
  expect(v1.estado).toBe("enviada");
  expect(v1.version).toBe(1);
  expect(v1.enviada_documento?.asunto).toBe(asunto);
  expect(v1.enviada_huella).toMatch(/^[0-9a-f]{64}$/);

  const token = (await duenio.database.rpc("obtener_enlace", { p_tipo: "cotizacion", p_id: id })).data as string;
  const portal = async () => (await anonimo.database.rpc("portal_documento", { p_token: token })).data as { documento: { asunto: string; version: number; huella: string; estado: string } } | null;
  const visto = await portal();
  expect(visto?.documento.version).toBe(1);
  expect(visto?.documento.huella).toBe(v1.enviada_huella);

  // Editar la cabecera: vuelve a borrador, v2, sin copia; el portal ya no la muestra.
  expect((await duenio.database.from("cotizaciones").update({ asunto: `${asunto} (cambio)` }).eq("id", id)).error).toBeNull();
  const v2 = await leer();
  expect([v2.estado, v2.version, v2.enviada_documento]).toEqual(["borrador", 2, null]);
  expect(await portal()).toBeNull();

  // Aceptar la v1 desde el portal ya no se puede.
  const tarde = await anonimo.database.rpc("aceptar_cotizacion", { p_token: token, p_nombre: "Persona de Prueba", p_dni: "12345678" });
  expect(tarde.error).not.toBeNull();
  expect(String(tarde.error?.message)).toMatch(/ya no está vigente/);

  // Reenviar congela la v2; tocar solo una línea (el total no cambia) también la descarta: v3.
  await enviar();
  expect((await leer()).enviada_documento?.asunto).toBe(`${asunto} (cambio)`);
  expect((await duenio.database.from("cotizacion_items").update({ descripcion: "Línea de prueba, corregida" }).eq("cotizacion_id", id)).error).toBeNull();
  const v3 = await leer();
  expect([v3.estado, v3.version, v3.enviada_documento]).toEqual(["borrador", 3, null]);

  // Reenviar y aceptar: la aceptación guarda la copia enviada (v3) y su misma huella.
  await enviar();
  const v3enviada = await leer();
  expect(v3enviada.version).toBe(3);
  const ok = await anonimo.database.rpc("aceptar_cotizacion", { p_token: token, p_nombre: "Persona de Prueba", p_dni: "12345678" });
  expect(ok.error).toBeNull();
  const acept = await duenio.database.from("aceptaciones").select("huella, documento").eq("cotizacion_id", id).single();
  expect(acept.data?.huella).toBe(v3enviada.enviada_huella);
  expect((acept.data?.documento as { items: { descripcion: string }[] }).items[0].descripcion).toBe("Línea de prueba, corregida");
  const final = (await anonimo.database.rpc("portal_documento", { p_token: token })).data as { documento: { estado: string; version: number; huella: string; aceptacion: { por: string } } };
  expect([final.documento.estado, final.documento.version, final.documento.huella]).toEqual(["aceptada", 3, v3enviada.enviada_huella]);
  // El documento dice por qué camino llegó la aceptación (T-31): aquí, el enlace del portal.
  expect(final.documento.aceptacion.por).toBe("portal");
});

test("anular una cotización aceptada la saca de las deudas sin tocar la aceptación, y los cobros anulados no cuentan (T-30)", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-deuda", "90000001");
  const correo = "e2e-db-deuda@staging.aguemar.test";
  const cuenta = await cuentaFija(correo);
  if (!empresa.usuario_id) {
    const inv = await duenio.database.from("invitaciones").insert([{ owner_id: uid, tipo: "empresa", correo, cliente_id: empresa.id }]).select("id, token").single();
    expect(inv.error).toBeNull();
    expect((await cuenta.database.rpc("invitacion_aceptar", { p_token: inv.data!.token })).error).toBeNull();
  }
  await duenio.database.from("clientes").update({ modulos: ["cotizaciones"], activa: true }).eq("id", empresa.id);

  const asunto = `E2E anulación ${Date.now()}`;
  const id = await cotizacion(duenio, uid, empresa.id, asunto, { recordar_pago: false });
  expect((await aceptar(duenio, id)).error).toBeNull();
  const fila = await duenio.database.from("cotizaciones").select("total").eq("id", id).single();
  const total = fila.data!.total as number;

  const deuda = async () => {
    const r = await duenio.database.rpc("deudas_cotizacion", { p_cliente: empresa.id });
    expect(r.error).toBeNull();
    return (r.data as { cotizacion_id: string; pendiente: number }[]).find((f) => f.cotizacion_id === id) ?? null;
  };
  const pendienteWs = async () => ((await cuenta.database.rpc("ws_cotizaciones")).data as { total_pendiente: number }).total_pendiente;
  expect((await deuda())?.pendiente).toBe(total);
  const conDeuda = await pendienteWs();

  // Un cobro anulado deja de contar; el motivo es obligatorio y no se cambia ni se borra después.
  const k = await duenio.database.from("cobros").insert([{ owner_id: uid, cliente_id: empresa.id, cotizacion_id: id, monto: 1000, moneda: "PEN" }]).select("id").single();
  expect(k.error).toBeNull();
  expect((await deuda())?.pendiente).toBe(total - 1000);
  const sinMotivo = await duenio.database.from("cobros").update({ anulado_en: new Date().toISOString() }).eq("id", k.data!.id);
  expect(sinMotivo.error, "anular exige motivo").not.toBeNull();
  const anulado = await duenio.database.from("cobros").update({ anulado_en: new Date().toISOString(), anulado_motivo: "Se pagó dos veces" }).eq("id", k.data!.id);
  expect(anulado.error).toBeNull();
  expect((await deuda())?.pendiente, "el cobro anulado no cuenta").toBe(total);
  expect((await duenio.database.from("cobros").update({ monto: 5000 }).eq("id", k.data!.id)).error, "un cobro anulado no se modifica").not.toBeNull();
  expect((await duenio.database.from("cobros").delete().eq("id", k.data!.id)).error, "ni se borra").not.toBeNull();
  const visible = (await cuenta.database.rpc("ws_cotizaciones")).data as { cobros: { id: string }[] };
  expect(visible.cobros.map((c) => c.id), "la empresa no ve el cobro anulado").not.toContain(k.data!.id);

  // Anular: ni por UPDATE directo, ni sin motivo, ni siendo la empresa; sí el propietario con motivo.
  expect((await duenio.database.from("cotizaciones").update({ estado: "anulada" }).eq("id", id)).error, "por UPDATE directo no").not.toBeNull();
  expect((await duenio.database.rpc("cotizacion_anular", { p_id: id, p_motivo: "no" })).error, "sin motivo no").not.toBeNull();
  expect((await cuenta.database.rpc("cotizacion_anular", { p_id: id, p_motivo: "La empresa no puede" })).error, "la empresa no anula").not.toBeNull();
  const aceptacionAntes = await duenio.database.from("aceptaciones").select("huella, documento, nombre").eq("cotizacion_id", id).single();
  const r = await duenio.database.rpc("cotizacion_anular", { p_id: id, p_motivo: "El proyecto se canceló" });
  expect(r.error).toBeNull();

  // Ya no es deuda: ni suya ni en el total de la empresa. La aceptación sigue idéntica.
  expect(await deuda(), "una anulada no es deuda").toBeNull();
  expect(await pendienteWs()).toBe(conDeuda - total);
  const despues = await duenio.database.from("cotizaciones").select("estado, anulada_motivo, anulada_por").eq("id", id).single();
  expect(despues.data).toEqual({ estado: "anulada", anulada_motivo: "El proyecto se canceló", anulada_por: uid });
  const aceptacionDespues = await duenio.database.from("aceptaciones").select("huella, documento, nombre").eq("cotizacion_id", id).single();
  expect(aceptacionDespues.data).toEqual(aceptacionAntes.data);
  const vista = (await cuenta.database.rpc("ws_cotizacion", { p_id: id })).data as { estado: string; pendiente: number | null; anulada_en: string | null };
  expect([vista.estado, vista.pendiente]).toEqual(["anulada", null]);
  expect(vista.anulada_en).toBeTruthy();

  // Una anulada queda fija: ni se edita, ni se borra, ni se vuelve a aceptar, ni se anula de nuevo con otro motivo.
  expect((await duenio.database.from("cotizaciones").update({ asunto: `${asunto} (cambio)` }).eq("id", id)).error).not.toBeNull();
  expect((await duenio.database.from("cotizaciones").update({ estado: "enviada" }).eq("id", id)).error).not.toBeNull();
  expect((await duenio.database.from("cotizaciones").delete().eq("id", id)).error).not.toBeNull();
  expect((await duenio.database.from("cotizacion_items").update({ cantidad: 9 }).eq("cotizacion_id", id)).error).not.toBeNull();
  const otra = await aceptar(duenio, id);
  expect(otra.error).not.toBeNull();
  expect(String(otra.error?.message)).toMatch(/anulada/);
  const doble = await duenio.database.rpc("cotizacion_anular", { p_id: id, p_motivo: "Otro motivo" });
  expect((doble.data as { ya_anulada: boolean }).ya_anulada).toBe(true);
  expect((await duenio.database.from("cotizaciones").select("anulada_motivo").eq("id", id).single()).data?.anulada_motivo).toBe("El proyecto se canceló");
});

test("la empresa comenta su cotización enviada, no un borrador ni la de otra empresa, y elige sus avisos (T-34, T-35)", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-modulos", "90000002");
  const otra = await empresaFija(duenio, uid, "e2e-db-deuda", "90000001");
  const correo = "e2e-db-empresa@staging.aguemar.test";
  const cuenta = await cuentaFija(correo);
  if (!empresa.usuario_id) {
    const inv = await duenio.database.from("invitaciones").insert([{ owner_id: uid, tipo: "empresa", correo, cliente_id: empresa.id }]).select("id, token").single();
    expect(inv.error).toBeNull();
    expect((await cuenta.database.rpc("invitacion_aceptar", { p_token: inv.data!.token })).error).toBeNull();
  }
  const todos = ["proyectos", "calendario", "informes", "documentos", "cotizaciones", "equipos", "solicitudes"];
  const ajustar = (campos: Record<string, unknown>) => duenio.database.from("clientes").update(campos).eq("id", empresa.id);
  const asunto = `E2E dudas ${Date.now()}`;
  const propia = await cotizacion(duenio, uid, empresa.id, `${asunto} propia`);
  const borrador = await cotizacion(duenio, uid, empresa.id, `${asunto} borrador`, { estado: "borrador" });
  const ajena = await cotizacion(duenio, uid, otra.id, `${asunto} ajena`);
  const comentar = (id: string, texto = "¿Incluye el hosting?") => cuenta.database.rpc("ws_comentar", { p_entidad: "cotizacion", p_id: id, p_texto: texto });
  const hilo = async (id: string) => (await cuenta.database.rpc("ws_comentarios", { p_entidad: "cotizacion", p_id: id })).data as { texto: string; es_propietario: boolean }[];
  const avisosDe = async (id: string) => ((await duenio.database.from("clientes").select("avisos_correo").eq("id", id).single()).data as { avisos_correo: boolean }).avisos_correo;

  try {
    await ajustar({ modulos: todos, activa: true, avisos_correo: true });

    // T-35: la enviada de su empresa se comenta, y el hilo la devuelve.
    const ok = await comentar(propia);
    expect(ok.error).toBeNull();
    expect(ok.data).toBeTruthy();
    expect((await hilo(propia)).map((c) => c.texto)).toEqual(["¿Incluye el hosting?"]);
    expect((await hilo(propia))[0]?.es_propietario).toBe(false);

    // Un borrador no lo ve la empresa y la cotización de otra empresa tampoco: la base dice lo mismo que de lo que no existe.
    for (const id of [borrador, ajena]) {
      const r = await comentar(id);
      expect(r.error, `comentar ${id}`).not.toBeNull();
      expect(String(r.error?.message)).toMatch(/No encontramos ese elemento/);
    }

    // Sin el módulo Cotizaciones, ni se comenta ni se lee el hilo.
    await ajustar({ modulos: todos.filter((m) => m !== "cotizaciones") });
    expect(String((await comentar(propia)).error?.message)).toMatch(/No encontramos ese elemento/);
    expect(await hilo(propia)).toEqual([]);
    await ajustar({ modulos: todos });

    // T-34: la empresa lee y cambia solo sus avisos por correo.
    expect((await cuenta.database.rpc("ws_preferencias")).data).toEqual({ avisos_correo: true });
    const otraAntes = await avisosDe(otra.id);
    expect((await cuenta.database.rpc("ws_preferencias_guardar", { p_avisos: false })).error).toBeNull();
    expect(await avisosDe(empresa.id)).toBe(false);
    expect((await cuenta.database.rpc("ws_preferencias")).data).toEqual({ avisos_correo: false });
    expect(await avisosDe(otra.id)).toBe(otraAntes);
    const nulo = await cuenta.database.rpc("ws_preferencias_guardar", { p_avisos: null });
    expect(String(nulo.error?.message)).toMatch(/Indica si quieres recibir avisos/);

    // Empresa inactiva: no se reconoce a quien llama.
    await ajustar({ activa: false });
    expect((await cuenta.database.rpc("ws_preferencias")).data ?? null).toBeNull();
    expect(String((await cuenta.database.rpc("ws_preferencias_guardar", { p_avisos: true })).error?.message)).toMatch(/No tienes acceso a un workspace/);
  } finally {
    await ajustar({ modulos: todos, activa: true, avisos_correo: true });
    await duenio.database.from("comentarios").delete().in("entidad_id", [propia, borrador, ajena]);
    await duenio.database.from("cotizaciones").delete().in("id", [propia, borrador, ajena]);
  }
});

test("recordatorios de pago: la clave mala no entra y lo ya tomado no se entrega otra vez", async () => {
  test.setTimeout(120_000);
  test.skip(!CRON_SECRET, "Define CRON_SECRET (el de staging, el mismo cuyo hash está en ajustes_sistema).");
  const { c: duenio } = await propietario();
  const anon = await clienteNuevo();
  type Tomado = { cotizacion_id: string; tipo: string };
  const tomar = async () => {
    const r = await anon.database.rpc("cobro_recordatorios_tomar", { p_clave: CRON_SECRET });
    expect(r.error).toBeNull();
    return (r.data as Tomado[]) ?? [];
  };

  const mala = await anon.database.rpc("cobro_recordatorios_tomar", { p_clave: "x".repeat(48) });
  expect(mala.error, "una clave que no es la del cron no entrega nada").not.toBeNull();
  expect(mala.data ?? null).toBeNull();

  // Para ejercitar la regla de verdad hace falta una cotización aceptada ANTES de hoy (el aviso "previo"
  // exige haberla aceptado otro día; la fecha de aceptación no se puede falsear). Se usan las fijas de la
  // prueba de deudas o la aceptada de prueba de SGC, se les ajusta el plazo para que sean candidatas y se
  // restauran al terminar. Cada combinación (tipo, vencimiento) se toma una sola vez en la vida de
  // staging, así que se prueban varios plazos hasta encontrar una que aún no se haya tomado.
  const hoy = new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10); // Lima = UTC-5
  const aceptadas = (
    await duenio.database
      .from("cotizaciones")
      .select("id, plazo_pago_dias, recordar_pago, aceptada_en")
      .eq("estado", "aceptada")
      .in("asunto", ["E2E deuda A (vence antes)", "E2E deuda B (vence después)", "e2e cotización aceptada"])
  ).data as { id: string; plazo_pago_dias: number; recordar_pago: boolean; aceptada_en: string }[];
  const candidata = aceptadas.find((c) => new Date(new Date(c.aceptada_en).getTime() - 5 * 3_600_000).toISOString().slice(0, 10) < hoy);

  let encontrada = false;
  if (candidata) {
    try {
      for (let plazo = 0; plazo <= 40 && !encontrada; plazo++) {
        await duenio.database.from("cotizaciones").update({ plazo_pago_dias: plazo, recordar_pago: true }).eq("id", candidata.id);
        const primera = (await tomar()).filter((t) => t.cotizacion_id === candidata.id);
        if (!primera.length) continue;
        encontrada = true;
        const segunda = (await tomar()).filter((t) => t.cotizacion_id === candidata.id && primera.some((p) => p.tipo === t.tipo));
        expect(segunda, "lo ya tomado no se entrega otra vez").toEqual([]);
      }
    } finally {
      await duenio.database.from("cotizaciones").update({ plazo_pago_dias: candidata.plazo_pago_dias, recordar_pago: candidata.recordar_pago }).eq("id", candidata.id);
    }
  }
  // Sin candidata (todas se aceptaron hoy) no hay qué entregar: se comprueba al menos que repetir no devuelve nada.
  if (!encontrada) {
    test.info().annotations.push({ type: "cobertura", description: "Sin cotización aceptada antes de hoy: solo se comprobó la clave y que repetir no entrega nada." });
    await tomar();
    expect(await tomar()).toEqual([]);
  }
});

test("una invitación revocada, vencida o ya usada no se puede aceptar y lo dice", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const anon = await clienteNuevo();
  const cuenta = await cuentaFija("e2e-db-invitada@staging.aguemar.test");
  const correo = "e2e-db-invitada@staging.aguemar.test";
  const creadas: string[] = [];
  const invitar = async (extra: Record<string, unknown>) => {
    const r = await duenio.database.from("invitaciones").insert([{ owner_id: uid, correo, ...extra }]).select("id, token").single();
    expect(r.error).toBeNull();
    creadas.push(r.data!.id as string);
    return r.data as { id: string; token: string };
  };
  const estado = async (token: string) => ((await anon.database.rpc("invitacion_ver", { p_token: token })).data as { estado: string }).estado;

  const empresa = await duenio.database
    .from("clientes")
    .insert([{ owner_id: uid, nombre: `E2E invitación ${Date.now()}`, tipo_doc: "DNI", num_doc: `${Date.now()}`.slice(-8), slug: `e2e-db-inv-${Date.now()}` }])
    .select("id")
    .single();
  expect(empresa.error).toBeNull();

  try {
    // Revocada.
    const revocada = await invitar({ tipo: "colaborador", nombre: "e2e" });
    await duenio.database.from("invitaciones").update({ revocada: true }).eq("id", revocada.id);
    expect(await estado(revocada.token)).toBe("revocada");
    const r1 = await cuenta.database.rpc("invitacion_aceptar", { p_token: revocada.token });
    expect(String(r1.error?.message)).toMatch(/venció/);

    // Vencida.
    const vencida = await invitar({ tipo: "colaborador", nombre: "e2e", expira_en: new Date(Date.now() - 3_600_000).toISOString() });
    expect(await estado(vencida.token)).toBe("vencida");
    const r2 = await cuenta.database.rpc("invitacion_aceptar", { p_token: vencida.token });
    expect(String(r2.error?.message)).toMatch(/venció/);

    // Usada: se acepta una vez y la segunda vez dice que ya se usó, sin cambiar nada.
    const usada = await invitar({ tipo: "empresa", cliente_id: empresa.data!.id });
    expect((await cuenta.database.rpc("invitacion_aceptar", { p_token: usada.token })).error).toBeNull();
    expect(await estado(usada.token)).toBe("usada");
    const r3 = await cuenta.database.rpc("invitacion_aceptar", { p_token: usada.token });
    expect(String(r3.error?.message)).toMatch(/ya se usó/);
    const vinculo = await duenio.database.from("clientes").select("usuario_id").eq("id", empresa.data!.id).single();
    expect(vinculo.data?.usuario_id, "la empresa sigue vinculada a una sola cuenta").not.toBeNull();
  } finally {
    // Borrar la empresa se lleva su invitación; las de colaborador se borran aparte.
    await duenio.database.from("clientes").delete().eq("id", empresa.data!.id);
    await duenio.database.from("invitaciones").delete().in("id", creadas);
  }
});

test("con el módulo Solicitudes desactivado o la empresa inactiva, la base no atiende a la empresa", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-modulos", "90000002");
  const correo = "e2e-db-empresa@staging.aguemar.test";
  const cuenta = await cuentaFija(correo);
  if (!empresa.usuario_id) {
    const inv = await duenio.database.from("invitaciones").insert([{ owner_id: uid, tipo: "empresa", correo, cliente_id: empresa.id }]).select("id, token").single();
    expect(inv.error).toBeNull();
    expect((await cuenta.database.rpc("invitacion_aceptar", { p_token: inv.data!.token })).error).toBeNull();
  }
  const todos = ["proyectos", "calendario", "informes", "documentos", "cotizaciones", "equipos", "solicitudes"];
  const ajustar = (campos: Record<string, unknown>) => duenio.database.from("clientes").update(campos).eq("id", empresa.id);
  const marca = `E2E solicitud ${Date.now()}`;
  const pedir = () => cuenta.database.rpc("ws_solicitar", { p_titulo: marca, p_descripcion: "Prueba de módulo" });

  try {
    // Con el módulo: la solicitud se crea.
    await ajustar({ modulos: todos, activa: true });
    const ok = await pedir();
    expect(ok.error).toBeNull();
    expect(ok.data).toBeTruthy();

    // Sin el módulo: la base la rechaza (no solo la página).
    await ajustar({ modulos: todos.filter((m) => m !== "solicitudes") });
    const sinModulo = await pedir();
    expect(sinModulo.error).not.toBeNull();
    expect(String(sinModulo.error?.message)).toMatch(/No tienes acceso a solicitudes/);

    // Empresa inactiva: ni se reconoce a la empresa ni se atiende nada.
    await ajustar({ modulos: todos, activa: false });
    expect((await cuenta.database.rpc("ws_mi_empresa")).data ?? null).toBeNull();
    const inactiva = await pedir();
    expect(inactiva.error).not.toBeNull();
    expect((await cuenta.database.rpc("ws_trabajos")).data ?? []).toEqual([]);
  } finally {
    await ajustar({ modulos: todos, activa: true });
    await duenio.database.from("solicitudes").delete().eq("titulo", marca);
  }
});

test("pedir una reunión: exige el módulo Calendario, valida la fecha, pone tope y la confirma el propietario", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-modulos", "90000002");
  const correo = "e2e-db-empresa@staging.aguemar.test";
  const cuenta = await cuentaFija(correo);
  if (!empresa.usuario_id) {
    const inv = await duenio.database.from("invitaciones").insert([{ owner_id: uid, tipo: "empresa", correo, cliente_id: empresa.id }]).select("id, token").single();
    expect(inv.error).toBeNull();
    expect((await cuenta.database.rpc("invitacion_aceptar", { p_token: inv.data!.token })).error).toBeNull();
  }
  const todos = ["proyectos", "calendario", "informes", "documentos", "cotizaciones", "equipos", "solicitudes"];
  const ajustar = (campos: Record<string, unknown>) => duenio.database.from("clientes").update(campos).eq("id", empresa.id);
  const marca = `E2E reunión ${Date.now()}`;
  const manana = new Date(Date.now() + 86_400_000 - 5 * 3_600_000).toISOString().slice(0, 10);
  const ayer = new Date(Date.now() - 86_400_000 - 5 * 3_600_000).toISOString().slice(0, 10);
  const pedir = (extra: Record<string, unknown> = {}) =>
    cuenta.database.rpc("ws_pedir_reunion", { p_tema: marca, p_detalle: "Prueba", p_fecha: manana, p_hora: "10:00", p_modalidad: "virtual", ...extra });
  let actividadId: string | null = null;

  try {
    await ajustar({ modulos: todos, activa: true });
    await duenio.database.from("solicitudes").delete().eq("cliente_id", empresa.id).eq("tipo", "reunion");

    // Con el módulo: se crea, la ve en su lista de reuniones y no en la de trabajos.
    const ok = await pedir();
    expect(ok.error).toBeNull();
    const pedidas = (await cuenta.database.rpc("ws_reuniones_pedidas")).data as { id: string; titulo: string; estado: string; hora_deseada: string; actividad: unknown }[];
    expect(pedidas.find((r) => r.id === ok.data)).toMatchObject({ titulo: marca, estado: "nueva", hora_deseada: "10:00", actividad: null });
    expect(((await cuenta.database.rpc("ws_solicitudes")).data as { id: string }[]).some((s) => s.id === ok.data)).toBe(false);

    // Fecha pasada, modalidad inválida y tema vacío se rechazan en la base.
    expect(String((await pedir({ p_fecha: ayer })).error?.message)).toMatch(/pasada/);
    expect(String((await pedir({ p_modalidad: "telepatia" })).error?.message)).toMatch(/virtual o presencial/);
    expect(String((await pedir({ p_tema: " " })).error?.message)).toMatch(/de qué quieres hablar/);

    // El propietario la confirma: la actividad visible aparece en la lista de la empresa.
    const act = await duenio.database
      .from("actividades")
      .insert([{ owner_id: uid, cliente_id: empresa.id, titulo: marca, tipo: "reunion", fecha: manana, hora_inicio: "10:00", hora_fin: "10:30", lugar: "https://meet.example.test/e2e", visible_empresa: true }])
      .select("id")
      .single();
    expect(act.error).toBeNull();
    actividadId = act.data!.id as string;
    const conf = await duenio.database.from("solicitudes").update({ estado: "aceptada", actividad_id: actividadId, respuesta: "Confirmada." }).eq("id", ok.data as string);
    expect(conf.error).toBeNull();
    const luego = (await cuenta.database.rpc("ws_reuniones_pedidas")).data as { id: string; estado: string; actividad: { id: string; hora_inicio: string } | null }[];
    expect(luego.find((r) => r.id === ok.data)).toMatchObject({ estado: "aceptada", actividad: { id: actividadId, hora_inicio: "10:00" } });

    // Tope: 5 pedidos por día y empresa (ya hay 1).
    for (let i = 0; i < 4; i++) expect((await pedir()).error).toBeNull();
    expect(String((await pedir()).error?.message)).toMatch(/límite de pedidos de reunión/);

    // Sin el módulo Calendario la base no atiende, ni al pedir ni al listar.
    await ajustar({ modulos: todos.filter((m) => m !== "calendario") });
    expect(String((await pedir()).error?.message)).toMatch(/No tienes acceso al calendario/);
    expect((await cuenta.database.rpc("ws_reuniones_pedidas")).data).toEqual([]);

    // Empresa inactiva: tampoco.
    await ajustar({ modulos: todos, activa: false });
    expect((await pedir()).error).not.toBeNull();
  } finally {
    await ajustar({ modulos: todos, activa: true });
    await duenio.database.from("solicitudes").delete().eq("cliente_id", empresa.id).eq("tipo", "reunion");
    if (actividadId) await duenio.database.from("actividades").delete().eq("id", actividadId);
  }
});

test("los triggers de la base dan los mismos totales que el cálculo de TypeScript (tests/fixtures/cotizaciones.json)", async () => {
  test.setTimeout(120_000);
  const { c: duenio, uid } = await propietario();
  const empresa = await empresaFija(duenio, uid, "e2e-db-modulos", "90000002");
  const creadas: string[] = [];
  try {
    for (const caso of fixtureTotales.casos) {
      const cot = await duenio.database
        .from("cotizaciones")
        .insert([{ owner_id: uid, cliente_id: empresa.id, asunto: `E2E totales: ${caso.nombre}`, area: "soporte", igv_pct: caso.igv_pct, igv_modo: caso.igv_modo }])
        .select("id")
        .single();
      expect(cot.error, caso.nombre).toBeNull();
      creadas.push(cot.data!.id as string);
      const items = await duenio.database
        .from("cotizacion_items")
        .insert(caso.items.map((i, orden) => ({ owner_id: uid, cotizacion_id: cot.data!.id, descripcion: "Línea de prueba", unidad: "servicio", orden, ...i })))
        .select("id");
      expect(items.error, caso.nombre).toBeNull();

      const importes = (await duenio.database.from("cotizacion_items").select("importe").eq("cotizacion_id", cot.data!.id).order("orden")).data!.map((i) => i.importe);
      expect(importes, `${caso.nombre}: importes por línea`).toEqual(caso.esperado.importes);
      const fila = (await duenio.database.from("cotizaciones").select("subtotal, igv, total").eq("id", cot.data!.id).single()).data;
      expect(fila, `${caso.nombre}: totales`).toEqual({ subtotal: caso.esperado.subtotal, igv: caso.esperado.igv, total: caso.esperado.total });
    }
  } finally {
    // Son borradores: se borran (junto con sus líneas).
    if (creadas.length) await duenio.database.from("cotizaciones").delete().in("id", creadas);
  }
});
