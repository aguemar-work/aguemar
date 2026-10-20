import { cache } from "react";
import { crearClienteServidor } from "@/lib/insforge/server";
import type { ActaJson, BriefJson, FichaJson, InformeJson } from "@/lib/documentos";
import type { EstadoActividad, ItemCalendario, TipoActividad } from "@/lib/calendario";
import type { Area, EstadoCotizacion, EstadoFinalFicha, EstadoTrabajo, IgvModo, MedioPago, Moneda, Prioridad, TipoEntregable } from "@/types/database";
import { SinSesionError } from "./resultado";

/** Datos que devuelven las funciones ws_* (proyección segura, sin columnas internas). */
export interface WsEmpresa {
  id: string;
  nombre: string;
  slug: string;
  modulos: string[];
  contacto: string | null;
  ultimo_ingreso: string | null;
  marca: { nombre_comercial: string; responsable: string; telefono: string | null; correo: string | null } | null;
}

export interface WsTrabajoResumen {
  id: string;
  area: Area;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTrabajo;
  prioridad: Prioridad;
  fecha_inicio: string | null;
  fecha_compromiso: string | null;
  fecha_entrega: string | null;
  tareas_hechas: number;
  tareas_total: number;
  comentarios: number;
}

export interface WsTrabajo extends Omit<WsTrabajoResumen, "tareas_hechas" | "tareas_total" | "comentarios"> {
  etapas: { id: string; titulo: string; hecha: boolean; orden: number }[];
  tareas: { id: string; etapa_id: string | null; titulo: string; hecha: boolean; fecha_limite: string | null; orden: number }[];
  entregables: { id: string; nombre: string; tipo: TipoEntregable; url: string | null; nota: string | null }[];
}

export interface WsComentario {
  id: string;
  es_propietario: boolean;
  texto: string;
  created_at: string;
}

export interface WsInicio {
  activos: number;
  entregados: number;
  proximos: { id: string; titulo: string; area: Area; estado: EstadoTrabajo; fecha_compromiso: string | null }[];
  respuestas: { id: string; entidad: string; entidad_id: string; texto: string; created_at: string; titulo: string | null }[];
  actividades?: { id: string; titulo: string; tipo: string; fecha: string; hora_inicio: string | null }[];
  solicitudes_abiertas?: number;
  informes?: { id: string; numero: string | null; titulo: string; periodo_inicio: string; periodo_fin: string }[];
}

export interface WsInformeResumen {
  id: string;
  numero: string | null;
  fecha: string;
  area: Area;
  titulo: string;
  periodo_inicio: string;
  periodo_fin: string;
  resumen: string | null;
  publicado_en: string | null;
  comentarios: number;
}

export interface WsCotizacionResumen {
  id: string;
  numero: string | null;
  fecha: string;
  vence: string;
  asunto: string;
  area: Area;
  moneda: Moneda;
  total: number;
  estado: EstadoCotizacion;
  aceptada_en: string | null;
  trabajo_id: string | null;
  /** Solo en las aceptadas: fecha de pago, lo que falta pagar y días de atraso. */
  vence_pago: string | null;
  pendiente: number | null;
  dias_atraso: number | null;
}

export interface WsCobro {
  id: string;
  fecha: string;
  monto: number;
  moneda: Moneda;
  medio: MedioPago;
  referencia: string | null;
  cotizacion_id: string | null;
  cotizacion_numero: string | null;
}

export interface WsCotizaciones {
  cotizaciones: WsCotizacionResumen[];
  cobros: WsCobro[];
  total_aceptado: number;
  total_cobrado: number;
  /** Lo pendiente (soles) cuya fecha de pago ya pasó. */
  total_vencido: number;
  /** El pago pendiente que vence primero. */
  proximo_pago: { vence_pago: string; pendiente: number; moneda: Moneda } | null;
}

export interface WsCotizacion {
  id: string;
  numero: string | null;
  fecha: string;
  validez_dias: number;
  vence: string;
  asunto: string;
  area: Area;
  moneda: Moneda;
  igv_pct: number;
  igv_modo: IgvModo;
  subtotal: number;
  igv: number;
  total: number;
  condiciones: string | null;
  estado: EstadoCotizacion;
  enviada_en: string | null;
  aceptada_en: string | null;
  trabajo_id: string | null;
  items: { descripcion: string; unidad: string; cantidad: number | string; precio_unitario: number; descuento: number; importe: number }[];
  aceptacion: { nombre: string; dni: string | null; aceptado_en: string } | null;
  cobrado: number;
  cliente: { nombre: string; tipo_doc: string | null; num_doc: string | null; contacto: string | null; direccion: string | null };
  marca: {
    nombre_comercial: string;
    responsable: string;
    cargo: string;
    ruc: string | null;
    telefono: string | null;
    correo: string | null;
    web: string | null;
    direccion: string | null;
    pago_cuenta: string | null;
    pago_cci: string | null;
    pago_yape: string | null;
    pago_plin: string | null;
  } | null;
}

export interface WsDocumento {
  id: string;
  tipo: "ficha" | "brief" | "acta";
  numero: string | null;
  fecha: string;
  titulo: string;
  area: string;
  /** Ficha: estado final; acta: por_aceptar | aceptada; brief: null. */
  estado: string | null;
  /** Ficha: equipo; brief y acta: trabajo. */
  detalle: string | null;
  estado_final: EstadoFinalFicha | null;
}

export interface WsEquipo {
  id: string;
  marca: string | null;
  modelo: string | null;
  serie: string;
  sistema_operativo: string | null;
  procesador: string | null;
  ram: string | null;
  almacenamiento: string | null;
  grafica: string | null;
  bateria: string | null;
  bios: string | null;
  fichas: { id: string; numero: string | null; fecha: string; tipo_servicio: string; estado_final: EstadoFinalFicha; proximo_mantenimiento: string | null }[];
}

export interface WsActividad {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoActividad;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  estado: EstadoActividad;
  trabajo: { id: string; titulo: string } | null;
}

export interface WsSolicitud {
  id: string;
  titulo: string;
  descripcion: string | null;
  area: Area | null;
  prioridad: Prioridad;
  fecha_deseada: string | null;
  estado: "nueva" | "en_revision" | "aceptada" | "rechazada";
  respuesta: string | null;
  created_at: string;
  trabajo: { id: string; titulo: string } | null;
}

async function rpc<T>(nombre: string, args?: Record<string, unknown>): Promise<T | null> {
  const insforge = await crearClienteServidor();
  if (!insforge) throw new SinSesionError();
  const { data, error } = await insforge.database.rpc(nombre, args);
  if (error) throw error;
  return (data as T | null) ?? null;
}

/**
 * Registro del ingreso del día (HU 2.1). El cliente se crea ahora, porque lee las cookies de la
 * petición; la llamada queda para `after()`, donde un Server Component ya no puede leerlas.
 */
async function prepararIngreso(): Promise<() => Promise<void>> {
  const insforge = await crearClienteServidor();
  return async () => {
    const { error } = (await insforge?.database.rpc("ws_registrar_ingreso")) ?? { error: null };
    if (error) console.error("[workspace] ws_registrar_ingreso falló:", error.message);
  };
}

export const ws = {
  // Cacheada por petición: el layout y la página la piden en la misma renderización.
  miEmpresa: cache(() => rpc<WsEmpresa>("ws_mi_empresa")),
  prepararIngreso,
  inicio: () => rpc<WsInicio>("ws_inicio"),
  trabajos: async () => (await rpc<WsTrabajoResumen[]>("ws_trabajos")) ?? [],
  trabajo: (id: string) => rpc<WsTrabajo>("ws_trabajo", { p_id: id }),
  cotizaciones: () => rpc<WsCotizaciones>("ws_cotizaciones"),
  cotizacion: (id: string) => rpc<WsCotizacion>("ws_cotizacion", { p_id: id }),
  documentos: async () => (await rpc<WsDocumento[]>("ws_documentos")) ?? [],
  ficha: (id: string) => rpc<FichaJson>("ws_ficha", { p_id: id }),
  brief: (id: string) => rpc<BriefJson>("ws_brief", { p_id: id }),
  acta: (id: string) => rpc<ActaJson>("ws_acta", { p_id: id }),
  equipos: async () => (await rpc<WsEquipo[]>("ws_equipos")) ?? [],
  calendario: async (desde: string, hasta: string) => (await rpc<ItemCalendario[]>("ws_calendario", { p_desde: desde, p_hasta: hasta })) ?? [],
  actividad: (id: string) => rpc<WsActividad>("ws_actividad", { p_id: id }),
  solicitudes: async () => (await rpc<WsSolicitud[]>("ws_solicitudes")) ?? [],
  informes: async () => (await rpc<WsInformeResumen[]>("ws_informes")) ?? [],
  informe: (id: string) => rpc<InformeJson>("ws_informe", { p_id: id }),
  comentarios: async (entidad: string, id: string) => (await rpc<WsComentario[]>("ws_comentarios", { p_entidad: entidad, p_id: id })) ?? [],
};
