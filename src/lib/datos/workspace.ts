import { cache } from "react";
import { crearClienteServidor } from "@/lib/insforge/server";
import type { Area, EstadoCotizacion, EstadoTrabajo, IgvModo, MedioPago, Moneda, Prioridad, TipoEntregable } from "@/types/database";
import { SinSesionError } from "./resultado";

/** Datos que devuelven las funciones ws_* (proyección segura, sin columnas internas). */
export interface WsEmpresa {
  id: string;
  nombre: string;
  slug: string;
  modulos: string[];
  contacto: string | null;
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

async function rpc<T>(nombre: string, args?: Record<string, unknown>): Promise<T | null> {
  const insforge = await crearClienteServidor();
  if (!insforge) throw new SinSesionError();
  const { data, error } = await insforge.database.rpc(nombre, args);
  if (error) throw error;
  return (data as T | null) ?? null;
}

export const ws = {
  // Cacheada por petición: el layout y la página la piden en la misma renderización.
  miEmpresa: cache(() => rpc<WsEmpresa>("ws_mi_empresa")),
  inicio: () => rpc<WsInicio>("ws_inicio"),
  trabajos: async () => (await rpc<WsTrabajoResumen[]>("ws_trabajos")) ?? [],
  trabajo: (id: string) => rpc<WsTrabajo>("ws_trabajo", { p_id: id }),
  cotizaciones: () => rpc<WsCotizaciones>("ws_cotizaciones"),
  cotizacion: (id: string) => rpc<WsCotizacion>("ws_cotizacion", { p_id: id }),
  comentarios: async (entidad: string, id: string) => (await rpc<WsComentario[]>("ws_comentarios", { p_entidad: entidad, p_id: id })) ?? [],
};
