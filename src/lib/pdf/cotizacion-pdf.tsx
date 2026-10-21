import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, Cabecera, Encabezado, Firmas, Pie, Seccion, TONO, contactoDe, registrarFuentes, s, type Tono } from "./base";
import { formatearFecha, formatearMonto, type Moneda } from "@/lib/format";
import { etiquetaVersion } from "@/lib/cotizacion";
import { rotuloArea } from "@/lib/areas";
import type { Area, EstadoCotizacion, IgvModo } from "@/types/database";

// ---------------------------------------------------------------------------
// Datos que necesita el PDF (los arma el panel o el workspace).
// ---------------------------------------------------------------------------
export interface DatosCotizacionPdf {
  numero: string | null;
  fecha: string;
  vence: string;
  asunto: string;
  area: Area;
  estado: EstadoCotizacion;
  moneda: Moneda;
  igv_pct: number;
  igv_modo: IgvModo;
  subtotal: number;
  igv: number;
  total: number;
  condiciones: string | null;
  /** Versión y huella de lo enviado (opcionales: los tests y los borradores no las traen). */
  version?: number;
  huella?: string | null;
  items: { descripcion: string; unidad: string; cantidad: number | string; precio_unitario: number; descuento: number; importe: number }[];
  aceptacion: { nombre: string; dni: string | null; aceptado_en: string } | null;
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

const col = { n: { width: 20 }, desc: { flex: 1, paddingRight: 8 }, cant: { width: 34, textAlign: "right" as const }, uni: { width: 54, paddingLeft: 8 }, pu: { width: 80, textAlign: "right" as const }, imp: { width: 88, textAlign: "right" as const } };

const ESTADO: Record<EstadoCotizacion, { texto: string } & Tono> = {
  borrador: { texto: "Borrador", ...TONO.neutro },
  enviada: { texto: "Vigente", ...TONO.ok },
  aceptada: { texto: "Aceptada", ...TONO.ok },
  rechazada: { texto: "Rechazada", ...TONO.error },
  vencida: { texto: "Vencida", ...TONO.neutro },
};

const cantidadTexto = (c: number | string) => String(Number(c)).replace(".", ",");

/** Cotización sobria: cabecera clara, partes, detalle con totales, condiciones y firmas. */
export function DocumentoCotizacion({ d }: { d: DatosCotizacionPdf }) {
  registrarFuentes();
  const marca = d.marca;
  const nombreMarca = marca?.nombre_comercial || "aguemar";
  const area = rotuloArea(d.area);
  const condiciones = (d.condiciones ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pagos = [
    ["Cuenta", marca?.pago_cuenta],
    ["CCI", marca?.pago_cci],
    ["Yape", marca?.pago_yape],
    ["Plin", marca?.pago_plin],
  ].filter(([, v]) => v) as [string, string][];
  const igvTexto = `${(d.igv_pct / 100).toLocaleString("es-PE", { maximumFractionDigits: 2 })} %`;
  let n = 1;
  const sig = () => String(n++).padStart(2, "0");

  return (
    <Document title={`${d.numero ?? "Cotización"} · ${d.cliente.nombre}`} author={nombreMarca} subject={d.asunto} creator="aguemar Studio" producer="aguemar Studio" language="es-PE">
      <Page size="A4" style={s.pagina}>
        <Encabezado izquierda={nombreMarca} derecha={`${d.numero ?? "BORRADOR"} · ${d.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />

        <Cabecera tipo="COTIZACIÓN" numero={d.numero} fecha={d.fecha} area={area} titulo={d.asunto} estado={ESTADO[d.estado]} version={etiquetaVersion(d.version ?? 1, d.huella)} />

        {/* Partes y vigencia, sin cajas. */}
        <View style={{ flexDirection: "row", marginTop: 12 }} wrap={false}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.etiqueta}>Para</Text>
            <Text style={{ fontWeight: 600 }}>{d.cliente.nombre}</Text>
            {d.cliente.num_doc ? <Text style={s.mono}>{`${d.cliente.tipo_doc ?? ""} ${d.cliente.num_doc}`}</Text> : null}
            {d.cliente.contacto ? <Text>Atención: {d.cliente.contacto}</Text> : null}
            {d.cliente.direccion ? <Text style={{ color: C.muted }}>{d.cliente.direccion}</Text> : null}
          </View>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.etiqueta}>De</Text>
            <Text style={{ fontWeight: 600 }}>{nombreMarca}</Text>
            {marca?.ruc ? <Text style={s.mono}>RUC {marca.ruc}</Text> : null}
            {marca ? <Text>{marca.responsable}</Text> : null}
            {marca?.direccion ? <Text style={{ color: C.muted }}>{marca.direccion}</Text> : null}
          </View>
          <View style={{ width: 100 }}>
            <Text style={s.etiqueta}>Válida hasta</Text>
            <Text style={s.mono}>{formatearFecha(d.vence)}</Text>
          </View>
        </View>

        <Seccion n={sig()} titulo="Detalle">
          <View style={s.cabTabla}>
            <Text style={col.n}>N°</Text>
            <Text style={col.desc}>Descripción</Text>
            <Text style={col.cant}>Cant.</Text>
            <Text style={col.uni}>Unidad</Text>
            <Text style={col.pu}>P. unit.</Text>
            <Text style={col.imp}>Importe</Text>
          </View>
          {d.items.map((it, i) => {
            const [titulo, ...detalle] = it.descripcion.split(/\r?\n/);
            return (
              <View key={i} style={s.filaTabla} wrap={false}>
                <Text style={[col.n, s.mono, { color: C.muted }]}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={col.desc}>
                  <Text style={{ fontWeight: 600 }}>{titulo}</Text>
                  {detalle.length ? <Text style={{ color: C.muted, fontSize: 8 }}>{detalle.join("\n")}</Text> : null}
                  {it.descuento ? <Text style={[s.mono, { color: C.muted, fontSize: 7.5 }]}>Descuento {formatearMonto(it.descuento, d.moneda)}</Text> : null}
                </View>
                <Text style={[col.cant, s.mono]}>{cantidadTexto(it.cantidad)}</Text>
                <Text style={col.uni}>{it.unidad}</Text>
                <Text style={[col.pu, s.mono]}>{formatearMonto(it.precio_unitario, d.moneda)}</Text>
                <Text style={[col.imp, s.mono]}>{formatearMonto(it.importe, d.moneda)}</Text>
              </View>
            );
          })}
          <View style={{ alignSelf: "flex-end", width: 210, marginTop: 6 }} wrap={false}>
            {[
              ["Subtotal", formatearMonto(d.subtotal, d.moneda)],
              [`IGV ${igvTexto}${d.igv_modo === "incluido" ? " (incluido)" : ""}`, formatearMonto(d.igv, d.moneda)],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 }}>
                <Text style={{ color: C.muted }}>{k}</Text>
                <Text style={s.mono}>{v}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4, marginTop: 3 }}>
              <Text style={{ fontWeight: 600 }}>Total</Text>
              <Text style={[s.mono, { fontWeight: 600, fontSize: 10.5 }]}>{formatearMonto(d.total, d.moneda)}</Text>
            </View>
          </View>
        </Seccion>

        {/* Condiciones y datos de pago lado a lado. */}
        {condiciones.length || pagos.length ? (
          <View style={{ flexDirection: "row" }} wrap={false}>
            {condiciones.length ? (
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Seccion n={sig()} titulo="Condiciones">
                  {condiciones.map((c, i) => (
                    <View key={i} style={{ flexDirection: "row", marginBottom: 2 }}>
                      <Text style={{ color: C.muted, width: 10 }}>·</Text>
                      <Text style={{ flex: 1 }}>{c}</Text>
                    </View>
                  ))}
                </Seccion>
              </View>
            ) : null}
            {pagos.length ? (
              <View style={condiciones.length ? { width: 190 } : { flex: 1 }}>
                <Seccion n={sig()} titulo="Datos de pago">
                  {pagos.map(([k, v]) => (
                    <View key={k} style={{ flexDirection: "row", marginBottom: 2 }}>
                      <Text style={{ width: 44, color: C.muted }}>{k}</Text>
                      <Text style={[s.mono, { flex: 1 }]}>{v}</Text>
                    </View>
                  ))}
                </Seccion>
              </View>
            ) : null}
          </View>
        ) : null}

        <Seccion n={sig()} titulo="Conformidad" juntos>
          {d.aceptacion ? (
            <Text style={{ color: C.mintInk }}>
              Aceptada por {d.aceptacion.nombre}
              {d.aceptacion.dni ? ` (DNI ${d.aceptacion.dni})` : ""} el {formatearFecha(d.aceptacion.aceptado_en)}.
            </Text>
          ) : null}
          <Firmas
            firmas={[
              [marca?.responsable ?? nombreMarca, marca ? `${marca.cargo} · ${nombreMarca}` : nombreMarca],
              [d.aceptacion?.nombre ?? d.cliente.contacto ?? "Nombre y firma", d.cliente.nombre],
            ]}
            contacto={contactoDe(marca)}
          />
        </Seccion>
      </Page>
    </Document>
  );
}

/** PDF listo para responder en un Route Handler. */
export async function pdfCotizacion(d: DatosCotizacionPdf): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<DocumentoCotizacion d={d} />);
  return new Uint8Array(buffer);
}
