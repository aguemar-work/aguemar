import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { C, Corchetes, Encabezado, Logo, Pie, Seccion, registrarFuentes, s } from "./base";
import { formatearFecha, formatearMonto, type Moneda } from "@/lib/format";
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

const col = { n: { width: 22 }, desc: { flex: 1, paddingRight: 8 }, cant: { width: 34, textAlign: "right" as const }, uni: { width: 54, paddingLeft: 8 }, pu: { width: 80, textAlign: "right" as const }, imp: { width: 88, textAlign: "right" as const } };

const ESTADO: Record<EstadoCotizacion, { texto: string; fondo: string; color: string }> = {
  borrador: { texto: "Borrador", fondo: "#2A3140", color: "#FFFFFF" },
  enviada: { texto: "Vigente", fondo: C.mint, color: C.ink },
  aceptada: { texto: "Aceptada", fondo: C.mint, color: C.ink },
  rechazada: { texto: "Rechazada", fondo: "#3A1A1A", color: "#FFD7D7" },
  vencida: { texto: "Vencida", fondo: "#2A3140", color: "#FFFFFF" },
};

const cantidadTexto = (c: number | string) => String(Number(c)).replace(".", ",");

export function DocumentoCotizacion({ d }: { d: DatosCotizacionPdf }) {
  registrarFuentes();
  const marca = d.marca;
  const nombreMarca = marca?.nombre_comercial || "agueMar";
  const area = rotuloArea(d.area);
  const estado = ESTADO[d.estado];
  const condiciones = (d.condiciones ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pagos = [
    ["Cuenta", marca?.pago_cuenta],
    ["CCI", marca?.pago_cci],
    ["Yape", marca?.pago_yape],
    ["Plin", marca?.pago_plin],
  ].filter(([, v]) => v) as [string, string][];
  const contacto = [marca?.telefono, marca?.correo, marca?.web].filter(Boolean) as string[];
  const igvTexto = `${(d.igv_pct / 100).toLocaleString("es-PE", { maximumFractionDigits: 2 })} %`;
  let n = 0;
  const sig = () => String(n++).padStart(2, "0");

  return (
    <Document title={`${d.numero ?? "Cotización"} · ${d.cliente.nombre}`} author={nombreMarca} subject={d.asunto} creator="agueMar Studio" producer="agueMar Studio" language="es-PE">
      {/* Portada */}
      <Page size="A4" style={s.portada}>
        <View style={{ position: "absolute", top: 18, right: 0 }}>
          <Corchetes ancho={300} opacidad={0.12} />
        </View>
        <Logo variante="claro" alto={34} />
        <View style={{ flexGrow: 1 }} />
        <Text style={[s.mono, { fontSize: 9, color: "#AEB6C4", marginBottom: 10 }]}>
          COTIZACIÓN · {d.numero ?? "BORRADOR"} · {formatearFecha(d.fecha)}
        </Text>
        <Text style={[s.mono, { fontSize: 11, color: C.mint, marginBottom: 8 }]}>{area}</Text>
        <Text style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>{d.asunto}</Text>
        <Text style={{ fontSize: 11, color: "#C9CFDA", lineHeight: 1.5, maxWidth: 420 }}>
          Para {d.cliente.nombre}. Total {formatearMonto(d.total, d.moneda)} {d.igv_modo === "sumar" ? "con IGV" : "IGV incluido"}. Válida hasta el {formatearFecha(d.vence)}.
        </Text>
        <View style={{ flexDirection: "row", marginTop: 16 }}>
          <Text style={{ backgroundColor: estado.fondo, color: estado.color, fontSize: 9, fontWeight: 600, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 }}>{estado.texto}</Text>
        </View>
        <View style={{ marginTop: 56, borderTopWidth: 0.6, borderTopColor: "#2A3140", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: "#AEB6C4" }}>
          <Text>
            {nombreMarca}
            {marca?.ruc ? ` · RUC ${marca.ruc}` : ""}
          </Text>
          <Text style={s.mono}>{contacto.join("  ·  ")}</Text>
        </View>
      </Page>

      {/* Contenido */}
      <Page size="A4" style={s.pagina}>
        <Encabezado derecha={`${d.numero ?? "BORRADOR"} · ${d.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />

        <Seccion n={sig()} titulo="Datos">
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1, backgroundColor: C.soft, padding: 10, borderRadius: 4 }}>
              <Text style={s.etiqueta}>Para</Text>
              <Text style={{ fontWeight: 600 }}>{d.cliente.nombre}</Text>
              {d.cliente.num_doc ? <Text style={s.mono}>{`${d.cliente.tipo_doc ?? ""} ${d.cliente.num_doc}`}</Text> : null}
              {d.cliente.contacto ? <Text>Atención: {d.cliente.contacto}</Text> : null}
              {d.cliente.direccion ? <Text style={{ color: C.muted }}>{d.cliente.direccion}</Text> : null}
            </View>
            <View style={{ flex: 1, backgroundColor: C.soft, padding: 10, borderRadius: 4 }}>
              <Text style={s.etiqueta}>De</Text>
              <Text style={{ fontWeight: 600 }}>{nombreMarca}</Text>
              {marca?.ruc ? <Text style={s.mono}>RUC {marca.ruc}</Text> : null}
              {marca ? <Text>{`${marca.responsable} · ${marca.cargo}`}</Text> : null}
              {contacto.length ? <Text style={[s.mono, { fontSize: 8.5, color: C.muted }]}>{contacto.join(" · ")}</Text> : null}
            </View>
            <View style={{ width: 120, padding: 10, borderWidth: 0.6, borderColor: C.line, borderRadius: 4 }}>
              <Text style={s.etiqueta}>Fecha</Text>
              <Text style={s.mono}>{formatearFecha(d.fecha)}</Text>
              <Text style={[s.etiqueta, { marginTop: 6 }]}>Válida hasta</Text>
              <Text style={s.mono}>{formatearFecha(d.vence)}</Text>
            </View>
          </View>
        </Seccion>

        <Seccion n={sig()} titulo="Detalle">
          <View style={s.cabTabla}>
            <Text style={[col.n, { paddingLeft: 6 }]}>N°</Text>
            <Text style={col.desc}>Descripción</Text>
            <Text style={col.cant}>Cant.</Text>
            <Text style={col.uni}>Unidad</Text>
            <Text style={col.pu}>P. unit.</Text>
            <Text style={[col.imp, { paddingRight: 6 }]}>Importe</Text>
          </View>
          {d.items.map((it, i) => {
            const [titulo, ...detalle] = it.descripcion.split(/\r?\n/);
            return (
              <View key={i} style={s.filaTabla} wrap={false}>
                <Text style={[col.n, s.mono, { paddingLeft: 6, color: C.mintInk }]}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={col.desc}>
                  <Text style={{ fontWeight: 600 }}>{titulo}</Text>
                  {detalle.length ? <Text style={{ color: C.muted, fontSize: 8.5 }}>{detalle.join("\n")}</Text> : null}
                  {it.descuento ? <Text style={[s.mono, { color: C.mintInk, fontSize: 8 }]}>Descuento {formatearMonto(it.descuento, d.moneda)}</Text> : null}
                </View>
                <Text style={[col.cant, s.mono]}>{cantidadTexto(it.cantidad)}</Text>
                <Text style={col.uni}>{it.unidad}</Text>
                <Text style={[col.pu, s.mono]}>{formatearMonto(it.precio_unitario, d.moneda)}</Text>
                <Text style={[col.imp, s.mono, { paddingRight: 6 }]}>{formatearMonto(it.importe, d.moneda)}</Text>
              </View>
            );
          })}
          <View style={{ alignSelf: "flex-end", width: 220, marginTop: 10 }} wrap={false}>
            {[
              ["Subtotal", formatearMonto(d.subtotal, d.moneda)],
              [`IGV ${igvTexto}${d.igv_modo === "incluido" ? " (incluido)" : ""}`, formatearMonto(d.igv, d.moneda)],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                <Text style={{ color: C.muted }}>{k}</Text>
                <Text style={s.mono}>{v}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: C.ink, color: "#FFFFFF", padding: 8, borderRadius: 4, marginTop: 6 }}>
              <Text style={{ fontWeight: 600 }}>Total</Text>
              <Text style={[s.mono, { fontWeight: 600, color: C.mint }]}>{formatearMonto(d.total, d.moneda)}</Text>
            </View>
          </View>
        </Seccion>

        {condiciones.length ? (
          <Seccion n={sig()} titulo="Condiciones">
            {condiciones.map((c, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 3 }} wrap={false}>
                <Text style={[s.mono, { color: C.mintInk, width: 16 }]}>›</Text>
                <Text style={{ flex: 1 }}>{c}</Text>
              </View>
            ))}
          </Seccion>
        ) : null}

        {pagos.length ? (
          <Seccion n={sig()} titulo="Datos de pago">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} wrap={false}>
              {pagos.map(([k, v]) => (
                <View key={k} style={{ backgroundColor: C.soft, borderRadius: 4, padding: 8, minWidth: 120 }}>
                  <Text style={s.etiqueta}>{k}</Text>
                  <Text style={s.mono}>{v}</Text>
                </View>
              ))}
            </View>
          </Seccion>
        ) : null}

        <Seccion n={sig()} titulo="Conformidad" juntos>
          <View>
            {d.aceptacion ? (
              <Text style={{ backgroundColor: C.mintSoft, color: C.mintInk, padding: 8, borderRadius: 4, marginBottom: 12 }}>
                Aceptada por {d.aceptacion.nombre}
                {d.aceptacion.dni ? ` (DNI ${d.aceptacion.dni})` : ""} el {formatearFecha(d.aceptacion.aceptado_en)}.
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: 32, marginTop: 36 }}>
              <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4 }}>
                <Text style={{ fontWeight: 600 }}>{marca?.responsable ?? nombreMarca}</Text>
                <Text style={{ color: C.muted, fontSize: 8.5 }}>{marca ? `${marca.cargo} · ${nombreMarca}` : nombreMarca}</Text>
              </View>
              <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4 }}>
                <Text style={{ fontWeight: 600 }}>{d.aceptacion?.nombre ?? d.cliente.contacto ?? "Nombre y firma"}</Text>
                <Text style={{ color: C.muted, fontSize: 8.5 }}>{d.cliente.nombre}</Text>
              </View>
            </View>

            <View style={{ marginTop: 28, backgroundColor: C.ink, color: "#FFFFFF", borderRadius: 6, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontWeight: 600, fontSize: 11 }}>¿Dudas? Conversemos.</Text>
                <Text style={[s.mono, { color: "#AEB6C4", fontSize: 8.5, marginTop: 2 }]}>{contacto.length ? contacto.join("  ·  ") : "[PENDIENTE: contacto en Mi marca]"}</Text>
              </View>
              <Logo variante="claro" alto={22} />
            </View>
          </View>
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
