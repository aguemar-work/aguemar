/**
 * Recordatorios de pago: el correo (función pura, fácil de probar) y la tarea diaria
 * que los toma de la base y los envía. La tarea entra con el cliente anónimo y
 * CRON_SECRET; la base compara el hash (cobro_recordatorios_tomar), sin clave de servicio.
 */
import { clienteAnonimo } from "@/lib/datos/landing";
import { envPublico, envServidor } from "@/lib/env";
import { formatearFecha, formatearMonto, type Moneda } from "@/lib/format";
import { moduloActivo } from "@/lib/modulos";
import { enviarCorreo, type Envio } from "./enviar";
import { pieParaEmpresa } from "./plantilla";

export type TipoRecordatorio = "previo" | "atraso_1" | "atraso_7";

/** Lo que devuelve cobro_recordatorios_tomar por cada recordatorio registrado. */
export interface RecordatorioPago {
  id: string;
  tipo: TipoRecordatorio;
  cotizacion_id: string;
  numero: string | null;
  asunto: string | null;
  moneda: Moneda;
  total: number;
  pendiente: number;
  vence_pago: string;
  dias_atraso: number;
  empresa: { nombre: string; contacto: string | null; correo: string; slug: string | null; modulos: string[] | null; con_acceso: boolean };
  enlace: string | null;
  marca: {
    nombre_comercial: string | null;
    responsable: string | null;
    correo: string | null;
    telefono: string | null;
    pago_cuenta: string | null;
    pago_cci: string | null;
    pago_yape: string | null;
    pago_plin: string | null;
  } | null;
}

const dias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

/** Datos de pago de Mi marca, una línea por medio. Null si no hay ninguno. */
export function datosDePago(m: RecordatorioPago["marca"]): string | null {
  if (!m) return null;
  const lineas = [
    m.pago_yape ? `Yape: ${m.pago_yape}` : null,
    m.pago_plin ? `Plin: ${m.pago_plin}` : null,
    m.pago_cuenta ? `Cuenta: ${m.pago_cuenta}` : null,
    m.pago_cci ? `CCI: ${m.pago_cci}` : null,
  ].filter(Boolean);
  return lineas.length ? lineas.join("\n") : null;
}

/** Arma el correo de un recordatorio. `sitio` es la URL pública (sin barra final). */
export function correoRecordatorioPago(r: RecordatorioPago, sitio: string, responderA: string | null): Envio {
  const base = sitio.replace(/\/$/, "");
  const doc = r.numero ?? "tu cotización";
  const pendiente = formatearMonto(r.pendiente, r.moneda);
  const vence = formatearFecha(r.vence_pago);
  const parcial = r.pendiente < r.total ? ` Queda pendiente ${pendiente} de ${formatearMonto(r.total, r.moneda)}.` : "";
  const saludo = r.empresa.contacto ? `Hola ${r.empresa.contacto.trim().split(/\s+/)[0]},` : "Hola,";
  const pago = datosDePago(r.marca);

  const textos: Record<TipoRecordatorio, { asunto: string; titulo: string; aviso: string }> = {
    previo: {
      asunto: `Recordatorio: tu pago de ${pendiente} vence el ${vence}`,
      titulo: `Tu pago vence el ${vence}`,
      aviso: `Te recordamos que el pago de la cotización ${doc}${r.asunto ? ` («${r.asunto}»)` : ""} vence el ${vence}.${parcial}`,
    },
    atraso_1: {
      asunto: `Pago pendiente: ${doc} venció el ${vence}`,
      titulo: "Tu pago quedó pendiente",
      aviso: `El pago de la cotización ${doc}${r.asunto ? ` («${r.asunto}»)` : ""} venció el ${vence} y aún figura pendiente: ${pendiente}.`,
    },
    atraso_7: {
      asunto: `Seguimos esperando tu pago de ${doc}`,
      titulo: `Tu pago lleva ${dias(r.dias_atraso)} pendiente`,
      aviso: `El pago de la cotización ${doc}${r.asunto ? ` («${r.asunto}»)` : ""} venció el ${vence} y sigue pendiente: ${pendiente}. Si hay algo que debamos revisar, cuéntanos y lo vemos juntos.`,
    },
  };
  const t = textos[r.tipo];

  const enEspacio = r.empresa.con_acceso && r.empresa.slug && moduloActivo(r.empresa.modulos, "cotizaciones");
  const boton = enEspacio
    ? { texto: "Ver mi saldo", url: `${base}/w/${r.empresa.slug}/cotizaciones/${r.cotizacion_id}` }
    : r.enlace
      ? { texto: "Ver la cotización", url: `${base}/d/${r.enlace}` }
      : null;

  return {
    para: r.empresa.correo,
    asunto: t.asunto,
    rotulo: "// recordatorio de pago",
    titulo: t.titulo,
    parrafos: [
      saludo,
      t.aviso,
      pago ? "Puedes pagar con cualquiera de estos medios:" : "Si necesitas los datos de pago, responde este correo y te los enviamos.",
    ],
    cita: pago,
    boton,
    pie: `Si ya pagaste, responde este correo con el comprobante y lo registramos. ${pieParaEmpresa(r.empresa.nombre)}`,
    responderA,
  };
}

export interface ResultadoRecordatorios {
  tomados: number;
  enviados: number;
  fallidos: number;
  omitido?: string;
}

/**
 * Tarea diaria: toma los recordatorios del día, los envía y devuelve a la base los que
 * fallaron para que se reintenten mañana. Sin Resend no toma nada (quedarían registrados
 * sin haber salido).
 */
export async function enviarRecordatoriosPago(clave: string): Promise<ResultadoRecordatorios> {
  const { RESEND_API_KEY, AVISOS_PARA } = envServidor();
  if (!RESEND_API_KEY) return { tomados: 0, enviados: 0, fallidos: 0, omitido: "sin RESEND_API_KEY" };
  const db = clienteAnonimo()?.database;
  if (!db) return { tomados: 0, enviados: 0, fallidos: 0, omitido: "sin InsForge" };

  const { data, error } = await db.rpc("cobro_recordatorios_tomar", { p_clave: clave });
  if (error) throw new Error(`cobro_recordatorios_tomar falló: ${error.message ?? "sin detalle"}`);
  const lista = (data ?? []) as RecordatorioPago[];

  const fallidos: string[] = [];
  for (const r of lista) {
    const envio = correoRecordatorioPago(r, envPublico.NEXT_PUBLIC_SITE_URL, AVISOS_PARA ?? r.marca?.correo ?? null);
    const res = await enviarCorreo(envio);
    if (!res.ok) fallidos.push(r.id);
  }

  if (fallidos.length) {
    const { error: e } = await db.rpc("cobro_recordatorios_fallidos", { p_clave: clave, p_ids: fallidos });
    if (e) console.error("[recordatorios] No se pudieron devolver los fallidos:", e.message);
  }
  return { tomados: lista.length, enviados: lista.length - fallidos.length, fallidos: fallidos.length };
}
