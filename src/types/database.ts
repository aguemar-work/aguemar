/**
 * Tipos de la base de datos, alineados a supabase/migrations.
 * Mantener a mano hasta conectar el proyecto; luego se puede regenerar con
 * `supabase gen types typescript --linked > src/types/database.ts`.
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

/** Hace opcionales las columnas con default para los Insert. */
type ClavesBase = keyof Base;
type Insertable<Row extends Base, Opcionales extends keyof Row = never> = Omit<Row, ClavesBase | Opcionales> &
  Partial<Pick<Row, ClavesBase | Opcionales>>;

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
  cantidad: number | string; // numeric(12,3): Supabase lo devuelve como string
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

// ---------- Definición para supabase-js ----------
type Tabla<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      perfil_marca: Tabla<
        PerfilMarcaRow,
        Insertable<
          PerfilMarcaRow,
          | "nombre_comercial" | "responsable" | "cargo" | "ruc" | "telefono" | "correo" | "web" | "direccion"
          | "igv_pct" | "moneda_default" | "validez_dias_default" | "condiciones_default"
          | "pago_cuenta" | "pago_cci" | "pago_yape" | "pago_plin"
        >
      >;
      clientes: Tabla<
        ClienteRow,
        Insertable<ClienteRow, "tipo_doc" | "num_doc" | "contacto" | "telefono" | "correo" | "direccion" | "notas">
      >;
      equipos: Tabla<
        EquipoRow,
        Insertable<
          EquipoRow,
          "marca" | "modelo" | "sistema_operativo" | "procesador" | "ram" | "almacenamiento" | "grafica" | "bateria" | "bios" | "notas"
        >
      >;
      servicios: Tabla<ServicioRow, Insertable<ServicioRow, "descripcion" | "precio_base" | "unidad" | "visible_landing" | "orden">>;
      contadores: Tabla<ContadorRow, Partial<ContadorRow> & Pick<ContadorRow, "tipo" | "anio">>;
      cotizaciones: Tabla<
        CotizacionRow,
        Insertable<
          CotizacionRow,
          | "numero" | "fecha" | "validez_dias" | "asunto" | "moneda" | "igv_pct" | "igv_modo"
          | "subtotal" | "igv" | "total" | "condiciones" | "notas" | "estado" | "enviada_en" | "aceptada_en"
        >
      >;
      cotizacion_items: Tabla<
        CotizacionItemRow,
        Insertable<CotizacionItemRow, "servicio_id" | "cantidad" | "precio_unitario" | "descuento" | "importe" | "orden">
      >;
      fichas: Tabla<
        FichaRow,
        Insertable<
          FichaRow,
          | "numero" | "equipo_id" | "cotizacion_id" | "fecha" | "tipo_servicio" | "modalidad" | "titular" | "resumen"
          | "estado_final" | "indicadores" | "proximo_mantenimiento" | "recordatorio_enviado_en"
        >
      >;
      ficha_diagnosticos: Tabla<FichaDiagnosticoRow, Insertable<FichaDiagnosticoRow, "resultado" | "estado" | "orden">>;
      ficha_trabajos: Tabla<FichaTrabajoRow, Insertable<FichaTrabajoRow, "detalle" | "hecho" | "orden">>;
      ficha_incidencias: Tabla<FichaIncidenciaRow, Insertable<FichaIncidenciaRow, "causa" | "solucion" | "estado" | "orden">>;
      ficha_recomendaciones: Tabla<FichaRecomendacionRow, Insertable<FichaRecomendacionRow, "orden">>;
      plantillas_checklist: Tabla<PlantillaChecklistRow, Insertable<PlantillaChecklistRow, "items">>;
      leads: Tabla<
        LeadRow,
        Omit<LeadRow, "id" | "created_at" | "updated_at" | "owner_id" | "estado" | "ip" | "user_agent" | "cliente_id"> &
          Partial<Pick<LeadRow, "id" | "created_at" | "updated_at" | "owner_id" | "estado" | "ip" | "user_agent" | "cliente_id">>
      >;
      enlaces_publicos: Tabla<EnlacePublicoRow, Insertable<EnlacePublicoRow, "token" | "revocado" | "vistas" | "ultima_vista">>;
      aceptaciones: Tabla<AceptacionRow, Insertable<AceptacionRow, "ip" | "user_agent" | "aceptado_en">>;
    };
    Views: Record<string, never>;
    Functions: {
      siguiente_numero: {
        Args: { p_tipo: string; p_anio: number; p_owner?: string };
        Returns: string;
      };
      vencer_cotizaciones: {
        Args: { p_owner?: string };
        Returns: number;
      };
      portal_documento: {
        Args: { p_token: string };
        Returns: Json;
      };
      crear_lead: {
        Args: {
          p_nombre: string;
          p_telefono: string | null;
          p_correo: string | null;
          p_servicio: string | null;
          p_mensaje: string | null;
          p_ip?: string | null;
          p_user_agent?: string | null;
        };
        Returns: string;
      };
      aceptar_cotizacion: {
        Args: { p_token: string; p_nombre: string; p_dni: string; p_ip?: string | null; p_user_agent?: string | null };
        Returns: Json;
      };
      generar_token: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      tipo_doc: TipoDoc;
      moneda: Moneda;
      igv_modo: IgvModo;
      estado_cotizacion: EstadoCotizacion;
      modalidad_servicio: ModalidadServicio;
      estado_final_ficha: EstadoFinalFicha;
      estado_diagnostico: EstadoDiagnostico;
      estado_incidencia: EstadoIncidencia;
      estado_lead: EstadoLead;
      tipo_documento: TipoDocumento;
    };
    CompositeTypes: Record<string, never>;
  };
};
