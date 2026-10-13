/**
 * Tipos de las tablas, alineados a migrations/*.sql (InsForge / Postgres).
 * El SDK de InsForge no es genérico por tabla: estos tipos se aplican al leer
 * (`as ClienteRow[]`) y al construir los inserts.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TipoDoc = "RUC" | "DNI";
export type Moneda = "PEN" | "USD";
export type IgvModo = "incluido" | "sumar";
export type EstadoCotizacion = "borrador" | "enviada" | "aceptada" | "rechazada" | "vencida";
export type ModalidadServicio = "remota" | "presencial";
export type EstadoFinalFicha = "operativo" | "operativo_observaciones" | "requiere_reparacion";
export type EstadoDiagnostico = "optimo" | "mejorable" | "atendido" | "critico";
export type EstadoIncidencia = "resuelta" | "pendiente" | "observacion";
export type EstadoLead = "nuevo" | "contactado" | "convertido";
export type TipoDocumento = "cotizacion" | "ficha";
export type Area = "diseno" | "desarrollo" | "soporte";
export type EstadoTrabajo = "propuesta" | "en_curso" | "en_revision" | "entregado" | "cerrado" | "cancelado";
export type Prioridad = "baja" | "media" | "alta";
export type TipoEntregable = "enlace" | "archivo" | "acceso" | "otro";

export interface Indicador {
  valor: string;
  etiqueta: string;
}

export interface ItemChecklist {
  titulo: string;
  detalle?: string;
}

type Base = {
  id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

// ---------- Filas ----------
export type PerfilMarcaRow = Base & {
  nombre_comercial: string;
  responsable: string;
  cargo: string;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
  web: string | null;
  direccion: string | null;
  igv_pct: number;
  moneda_default: Moneda;
  validez_dias_default: number;
  condiciones_default: string | null;
  pago_cuenta: string | null;
  pago_cci: string | null;
  pago_yape: string | null;
  pago_plin: string | null;
};

export type ClienteRow = Base & {
  nombre: string;
  tipo_doc: TipoDoc;
  num_doc: string | null;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  notas: string | null;
};

export type EquipoRow = Base & {
  cliente_id: string;
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
  notas: string | null;
};

export type ServicioRow = Base & {
  area: Area;
  nombre: string;
  descripcion: string | null;
  precio_base: number | null;
  unidad: string;
  visible_landing: boolean;
  orden: number;
};

export type ContadorRow = {
  owner_id: string;
  tipo: string;
  anio: number;
  ultimo: number;
};

export type CotizacionRow = Base & {
  numero: string | null;
  cliente_id: string;
  fecha: string;
  validez_dias: number;
  asunto: string;
  moneda: Moneda;
  igv_pct: number;
  igv_modo: IgvModo;
  subtotal: number;
  igv: number;
  total: number;
  condiciones: string | null;
  notas: string | null;
  estado: EstadoCotizacion;
  enviada_en: string | null;
  aceptada_en: string | null;
};

export type CotizacionItemRow = Base & {
  cotizacion_id: string;
  servicio_id: string | null;
  descripcion: string;
  cantidad: number | string; // numeric(12,3): PostgREST lo devuelve como string
  precio_unitario: number;
  descuento: number;
  importe: number;
  orden: number;
};

export type FichaRow = Base & {
  numero: string | null;
  cliente_id: string;
  equipo_id: string | null;
  cotizacion_id: string | null;
  fecha: string;
  tipo_servicio: string;
  modalidad: ModalidadServicio;
  titular: string;
  resumen: string | null;
  estado_final: EstadoFinalFicha;
  indicadores: Indicador[];
  proximo_mantenimiento: string | null;
  recordatorio_enviado_en: string | null;
};

export type FichaDiagnosticoRow = Base & {
  ficha_id: string;
  elemento: string;
  resultado: string;
  estado: EstadoDiagnostico;
  orden: number;
};

export type FichaTrabajoRow = Base & {
  ficha_id: string;
  titulo: string;
  detalle: string | null;
  hecho: boolean;
  orden: number;
};

export type FichaIncidenciaRow = Base & {
  ficha_id: string;
  titulo: string;
  causa: string | null;
  solucion: string | null;
  estado: EstadoIncidencia;
  orden: number;
};

export type FichaRecomendacionRow = Base & {
  ficha_id: string;
  texto: string;
  orden: number;
};

export type PlantillaChecklistRow = Base & {
  tipo_servicio: string;
  items: ItemChecklist[];
};

export type LeadRow = Omit<Base, "owner_id"> & {
  owner_id: string | null;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  servicio: string | null;
  mensaje: string | null;
  estado: EstadoLead;
  ip: string | null;
  user_agent: string | null;
  cliente_id: string | null;
};

export type EnlacePublicoRow = Base & {
  token: string;
  tipo: TipoDocumento;
  documento_id: string;
  revocado: boolean;
  vistas: number;
  ultima_vista: string | null;
};

export type AceptacionRow = Base & {
  cotizacion_id: string;
  nombre: string;
  dni: string;
  ip: string | null;
  user_agent: string | null;
  aceptado_en: string;
};

export type TrabajoRow = Base & {
  area: Area;
  cliente_id: string | null;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTrabajo;
  prioridad: Prioridad;
  fecha_inicio: string | null;
  fecha_compromiso: string | null;
  fecha_entrega: string | null;
  monto_estimado: number | null;
  moneda: Moneda;
  notas: string | null;
  orden: number;
};

export type TrabajoEtapaRow = Base & {
  trabajo_id: string;
  titulo: string;
  hecha: boolean;
  orden: number;
};

export type TrabajoTareaRow = Base & {
  trabajo_id: string;
  etapa_id: string | null;
  titulo: string;
  hecha: boolean;
  fecha_limite: string | null;
  orden: number;
};

export type TrabajoEntregableRow = Base & {
  trabajo_id: string;
  nombre: string;
  tipo: TipoEntregable;
  url: string | null;
  nota: string | null;
  orden: number;
};
