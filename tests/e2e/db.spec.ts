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
