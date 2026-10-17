import { Circle, Document, Image, Page, Path, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { formatearFecha } from "@/lib/format";
import { ESTADOS_DIAGNOSTICO, ESTADOS_FINALES, ESTADOS_INCIDENCIA, MODALIDADES, etiquetaDe, type FichaJson } from "@/lib/documentos";
import type { EstadoDiagnostico, EstadoFinalFicha, EstadoIncidencia } from "@/types/database";
import { C, Cabecera, Encabezado, Firmas, Pie, Pildora, Seccion, TONO, contactoDe, registrarFuentes, s, type Tono } from "./base";

const PILDORA_FINAL: Record<EstadoFinalFicha, Tono> = { operativo: TONO.ok, operativo_observaciones: TONO.aviso, requiere_reparacion: TONO.error };
const PILDORA_DIAG: Record<EstadoDiagnostico, Tono> = { optimo: TONO.ok, mejorable: TONO.aviso, atendido: TONO.neutro, critico: TONO.error };
const PILDORA_INC: Record<EstadoIncidencia, Tono> = { resuelta: TONO.ok, pendiente: TONO.aviso, observacion: TONO.neutro };

/** Check dibujado (las fuentes de la marca no traen el glifo ✓). */
function Marca({ hecho }: { hecho: boolean }) {
  return (
    <Svg viewBox="0 0 12 12" style={{ width: 8, height: 8, marginTop: 1.5, marginRight: 4 }}>
      {hecho ? (
        <>
          <Circle cx={6} cy={6} r={6} fill={C.mintInk} />
          <Path d="M3.2 6.2 L5.2 8.1 L8.9 4.2" stroke="#FFFFFF" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <Circle cx={6} cy={6} r={5.2} stroke={C.muted} strokeWidth={1.2} fill="none" />
      )}
    </Svg>
  );
}

/** Ficha técnica pensada para caber en una sola hoja: todo compacto y sin cajas. */
export function DocumentoFicha({ f, qr, url }: { f: FichaJson; qr: string | null; url: string | null }) {
  registrarFuentes();
  const marca = f.marca;
  const nombreMarca = marca?.nombre_comercial || "aguemar";
  const final = ESTADOS_FINALES.find((e) => e.valor === f.estado_final)!;
  const datos = [
    ["Empresa", f.cliente.nombre],
    ["Servicio", `${f.tipo_servicio} · ${etiquetaDe(MODALIDADES, f.modalidad).toLowerCase()}`],
    ["Técnico", marca ? marca.responsable : nombreMarca],
    ...(f.equipo
      ? [
          ["Equipo", [f.equipo.marca, f.equipo.modelo].filter(Boolean).join(" ")],
          ["Serie", f.equipo.serie],
          ["Sistema operativo", f.equipo.sistema_operativo],
          ["Procesador", f.equipo.procesador],
          ["Memoria RAM", f.equipo.ram],
          ["Almacenamiento", f.equipo.almacenamiento],
          ["Gráfica", f.equipo.grafica],
          ["Batería", f.equipo.bateria],
          ["BIOS", f.equipo.bios],
        ]
      : []),
  ].filter(([, v]) => v) as [string, string][];
  let n = 1;
  const sig = () => String(n++).padStart(2, "0");

  return (
    <Document title={`${f.numero ?? "Ficha técnica"} · ${f.cliente.nombre}`} author={nombreMarca} subject={f.titular} creator="aguemar Studio" producer="aguemar Studio" language="es-PE">
      <Page size="A4" style={[s.pagina, { fontSize: 8, lineHeight: 1.25 }]}>
        <Encabezado izquierda={nombreMarca} derecha={`${f.numero ?? "BORRADOR"} · ${f.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · soporte técnico`} />

        <Cabecera
          tipo="FICHA TÉCNICA"
          numero={f.numero}
          fecha={f.fecha}
          area="// soporte técnico"
          titulo={f.titular}
          resumen={f.resumen}
          estado={{ texto: final.etiqueta, ...PILDORA_FINAL[f.estado_final] }}
        />

        {f.indicadores.length ? (
          <View style={{ flexDirection: "row", marginTop: 10 }} wrap={false}>
            {f.indicadores.map((i, k) => (
              <View key={k} style={{ flex: 1, backgroundColor: C.soft, borderRadius: 3, paddingVertical: 4, paddingHorizontal: 7, marginLeft: k ? 6 : 0 }}>
                <Text style={[s.mono, { fontSize: 11, fontWeight: 600, color: C.mintInk, lineHeight: 1.2 }]}>{i.valor}</Text>
                <Text style={{ fontSize: 7, color: C.muted, lineHeight: 1.25 }}>{i.etiqueta}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Seccion n={sig()} titulo={f.equipo ? "Servicio y equipo" : "Servicio"}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }} wrap={false}>
            {datos.map(([k, v]) => (
              <View key={k} style={{ width: "50%", flexDirection: "row", paddingRight: 10, marginBottom: 2 }}>
                <Text style={{ width: 84, color: C.muted }}>{k}</Text>
                <Text style={[{ flex: 1 }, k === "Serie" || k === "BIOS" ? s.mono : {}]}>{v}</Text>
              </View>
            ))}
          </View>
        </Seccion>

        {f.diagnosticos.length ? (
          <Seccion n={sig()} titulo="Diagnóstico">
            <View style={s.cabTabla}>
              <Text style={{ width: 190 }}>Elemento</Text>
              <Text style={{ flex: 1 }}>Resultado</Text>
              <Text style={{ width: 64, textAlign: "right" }}>Estado</Text>
            </View>
            {f.diagnosticos.map((d, k) => (
              <View key={k} style={[s.filaTabla, { paddingVertical: 1, alignItems: "center" }]} wrap={false}>
                <Text style={{ width: 190, paddingRight: 8, fontWeight: 600 }}>{d.elemento}</Text>
                <Text style={{ flex: 1, color: C.muted, paddingRight: 6 }}>{d.resultado}</Text>
                <View style={{ width: 64, alignItems: "flex-end" }}>
                  <Pildora texto={etiquetaDe(ESTADOS_DIAGNOSTICO, d.estado)} {...PILDORA_DIAG[d.estado]} />
                </View>
              </View>
            ))}
          </Seccion>
        ) : null}

        {f.trabajos.length ? (
          <Seccion n={sig()} titulo="Trabajos realizados">
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {f.trabajos.map((t, k) => (
                // Solo el título: el detalle de la plantilla queda en la ficha en línea.
                <View key={k} style={{ width: "25%", flexDirection: "row", paddingRight: 8, marginBottom: 2 }} wrap={false}>
                  <Marca hecho={t.hecho} />
                  <Text style={{ flex: 1, color: t.hecho ? C.ink : C.muted }}>{t.titulo}</Text>
                </View>
              ))}
            </View>
          </Seccion>
        ) : null}

        {f.incidencias.length ? (
          <Seccion n={sig()} titulo="Incidencias atendidas">
            <View style={s.cabTabla}>
              <Text style={{ width: 112 }}>Incidencia</Text>
              <Text style={{ flex: 1 }}>Causa</Text>
              <Text style={{ flex: 1 }}>Solución</Text>
              <Text style={{ width: 56, textAlign: "right" }}>Estado</Text>
            </View>
            {f.incidencias.map((x, k) => (
              <View key={k} style={[s.filaTabla, { paddingVertical: 3 }]} wrap={false}>
                <Text style={{ width: 112, fontWeight: 600, paddingRight: 8 }}>{x.titulo}</Text>
                <Text style={{ flex: 1, paddingRight: 8, color: C.muted, fontSize: 7.5 }}>{x.causa ?? ""}</Text>
                <Text style={{ flex: 1, paddingRight: 8, fontSize: 7.5 }}>{x.solucion ?? ""}</Text>
                <View style={{ width: 56, alignItems: "flex-end" }}>
                  <Pildora texto={etiquetaDe(ESTADOS_INCIDENCIA, x.estado)} {...PILDORA_INC[x.estado]} />
                </View>
              </View>
            ))}
          </Seccion>
        ) : null}

        {f.recomendaciones.length || f.proximo_mantenimiento ? (
          <Seccion
            n={sig()}
            titulo="Recomendaciones"
            extra={
              f.proximo_mantenimiento ? (
                <Text>
                  Próximo mantenimiento: <Text style={[s.mono, { fontWeight: 600 }]}>{formatearFecha(f.proximo_mantenimiento)}</Text>
                </Text>
              ) : null
            }
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {f.recomendaciones.map((r, k) => (
                <View key={k} style={{ width: "50%", flexDirection: "row", paddingRight: 10, marginBottom: 3 }} wrap={false}>
                  <Text style={[s.mono, { color: C.mintInk, width: 16 }]}>{String(k + 1).padStart(2, "0")}</Text>
                  <Text style={{ flex: 1 }}>{r}</Text>
                </View>
              ))}
            </View>
          </Seccion>
        ) : null}

        {/* Conformidad: solo las firmas, sin título, para no gastar la hoja. */}
        <View wrap={false}>
          <Firmas
            firmas={[
              [marca?.responsable ?? nombreMarca, marca ? `${marca.cargo} · ${nombreMarca}` : nombreMarca],
              [f.cliente.contacto ?? "Nombre y firma", f.cliente.nombre],
            ]}
            contacto={contactoDe(marca)}
            nota={url ? `Verifica esta ficha: ${url}` : null}
            espacio={22}
            lateral={
              qr ? (
                // react-pdf Image no admite alt: el QR va acompañado de la URL de verificación.
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={qr} style={{ width: 48, height: 48 }} />
              ) : null
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** PDF de la ficha; con `url` (enlace del portal) agrega el QR de verificación. */
export async function pdfFicha(f: FichaJson, url: string | null): Promise<Uint8Array> {
  const qr = url ? await QRCode.toDataURL(url, { margin: 0, width: 200, color: { dark: "#0A0F1A", light: "#FFFFFF" } }) : null;
  const buffer = await renderToBuffer(<DocumentoFicha f={f} qr={qr} url={url} />);
  return new Uint8Array(buffer);
}
