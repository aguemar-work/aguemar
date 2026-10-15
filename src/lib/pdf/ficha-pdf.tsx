import { Circle, Document, Image, Page, Path, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { formatearFecha } from "@/lib/format";
import { ESTADOS_DIAGNOSTICO, ESTADOS_FINALES, ESTADOS_INCIDENCIA, MODALIDADES, etiquetaDe, type FichaJson } from "@/lib/documentos";
import type { EstadoDiagnostico, EstadoFinalFicha, EstadoIncidencia } from "@/types/database";
import { C, Corchetes, Encabezado, Logo, Pie, Seccion, registrarFuentes, s } from "./base";
import { telefonoLegible } from "@/lib/landing";

const PILDORA_FINAL: Record<EstadoFinalFicha, { fondo: string; color: string }> = {
  operativo: { fondo: C.mint, color: C.ink },
  operativo_observaciones: { fondo: C.warnSoft, color: C.warn },
  requiere_reparacion: { fondo: "#FDE8E8", color: "#9B1C1C" },
};
const PILDORA_DIAG: Record<EstadoDiagnostico, { fondo: string; color: string }> = {
  optimo: { fondo: C.mintSoft, color: C.mintInk },
  mejorable: { fondo: C.warnSoft, color: C.warn },
  atendido: { fondo: C.soft, color: C.muted },
  critico: { fondo: "#FDE8E8", color: "#9B1C1C" },
};
const PILDORA_INC: Record<EstadoIncidencia, { fondo: string; color: string }> = {
  resuelta: { fondo: C.mintSoft, color: C.mintInk },
  pendiente: { fondo: C.warnSoft, color: C.warn },
  observacion: { fondo: C.soft, color: C.muted },
};

/** Check dibujado (las fuentes de la marca no traen el glifo ✓). */
function Marca({ hecho }: { hecho: boolean }) {
  return (
    <Svg viewBox="0 0 12 12" style={{ width: 9, height: 9 }}>
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

function Pildora({ texto, fondo, color }: { texto: string; fondo: string; color: string }) {
  return <Text style={{ backgroundColor: fondo, color, fontSize: 7.5, fontWeight: 600, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8 }}>{texto}</Text>;
}

export function DocumentoFicha({ f, qr, url }: { f: FichaJson; qr: string | null; url: string | null }) {
  registrarFuentes();
  const marca = f.marca;
  const nombreMarca = marca?.nombre_comercial || "agueMar";
  const final = ESTADOS_FINALES.find((e) => e.valor === f.estado_final)!;
  const contacto = [telefonoLegible(marca?.telefono), marca?.correo, marca?.web].filter(Boolean) as string[];
  const equipo = f.equipo
    ? ([
        ["Marca y modelo", [f.equipo.marca, f.equipo.modelo].filter(Boolean).join(" ")],
        ["Serie", f.equipo.serie],
        ["Sistema operativo", f.equipo.sistema_operativo],
        ["Procesador", f.equipo.procesador],
        ["Memoria RAM", f.equipo.ram],
        ["Almacenamiento", f.equipo.almacenamiento],
        ["Gráfica", f.equipo.grafica],
        ["Batería", f.equipo.bateria],
        ["BIOS", f.equipo.bios],
      ].filter(([, v]) => v) as [string, string][])
    : [];
  let n = 0;
  const sig = () => String(n++).padStart(2, "0");
  // Trabajos en filas de 4 tarjetas (cada fila no se corta entre páginas).
  const filasTrabajos: FichaJson["trabajos"][] = [];
  for (let i = 0; i < f.trabajos.length; i += 4) filasTrabajos.push(f.trabajos.slice(i, i + 4));

  return (
    <Document title={`${f.numero ?? "Ficha técnica"} · ${f.cliente.nombre}`} author={nombreMarca} subject={f.titular} creator="agueMar Studio" producer="agueMar Studio" language="es-PE">
      {/* Portada */}
      <Page size="A4" style={s.portada}>
        <View style={{ position: "absolute", top: 18, right: 0 }}>
          <Corchetes ancho={300} opacidad={0.12} />
        </View>
        <Logo variante="claro" alto={34} />
        <View style={{ flexGrow: 1 }} />
        <Text style={[s.mono, { fontSize: 9, color: "#AEB6C4", marginBottom: 10 }]}>
          FICHA TÉCNICA · {f.numero ?? "BORRADOR"} · {formatearFecha(f.fecha)}
        </Text>
        <Text style={[s.mono, { fontSize: 11, color: C.mint, marginBottom: 8 }]}>{"// soporte técnico"}</Text>
        <Text style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>{f.titular}</Text>
        {f.resumen ? <Text style={{ fontSize: 11, color: "#C9CFDA", lineHeight: 1.5, maxWidth: 430 }}>{f.resumen}</Text> : null}
        <View style={{ flexDirection: "row", marginTop: 16 }}>
          <Text style={{ backgroundColor: PILDORA_FINAL[f.estado_final].fondo, color: PILDORA_FINAL[f.estado_final].color, fontSize: 9, fontWeight: 600, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 }}>
            {final.etiqueta}
          </Text>
        </View>
        <View style={{ marginTop: 48, borderTopWidth: 0.6, borderTopColor: "#2A3140", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ fontSize: 8.5, color: "#AEB6C4" }}>
            <Text>{`${f.cliente.nombre} · ${f.equipo ? [f.equipo.marca, f.equipo.modelo].filter(Boolean).join(" ") : f.tipo_servicio}`}</Text>
            <Text style={s.mono}>{contacto.join("  ·  ")}</Text>
          </View>
          {qr ? (
            <View style={{ alignItems: "center" }}>
              <View style={{ backgroundColor: "#FFFFFF", padding: 4, borderRadius: 4 }}>
                {/* react-pdf Image no admite alt: el QR va acompañado del texto y la URL. */}
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={qr} style={{ width: 62, height: 62 }} />
              </View>
              <Text style={{ fontSize: 7, color: "#AEB6C4", marginTop: 3 }}>Verifica esta ficha</Text>
            </View>
          ) : null}
        </View>
      </Page>

      {/* Contenido */}
      <Page size="A4" style={s.pagina}>
        <Encabezado derecha={`${f.numero ?? "BORRADOR"} · ${f.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · soporte técnico`} />

        {f.indicadores.length ? (
          <Seccion n={sig()} titulo="Indicadores clave">
            <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
              {f.indicadores.map((i, k) => (
                <View key={k} style={{ flex: 1, borderWidth: 0.6, borderColor: C.line, borderRadius: 4, padding: 10 }}>
                  <Text style={[s.mono, { fontSize: 17, fontWeight: 600, color: C.mintInk, lineHeight: 1.2, marginBottom: 4 }]}>{i.valor}</Text>
                  <Text style={{ fontSize: 8, color: C.muted, lineHeight: 1.3 }}>{i.etiqueta}</Text>
                </View>
              ))}
            </View>
          </Seccion>
        ) : null}

        <Seccion n={sig()} titulo="Datos del servicio">
          <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
            {[
              ["Fecha", formatearFecha(f.fecha)],
              ["Modalidad", `${etiquetaDe(MODALIDADES, f.modalidad)} · ${f.tipo_servicio}`],
              ["Cliente", f.cliente.nombre],
              ["Técnico", marca ? marca.responsable : nombreMarca],
            ].map(([k, v]) => (
              <View key={k} style={{ flex: 1, backgroundColor: C.soft, borderRadius: 4, padding: 8 }}>
                <Text style={s.etiqueta}>{k}</Text>
                <Text>{v}</Text>
              </View>
            ))}
          </View>
        </Seccion>

        {equipo.length ? (
          <Seccion n={sig()} titulo="Ficha del equipo">
            {equipo.map(([k, v]) => (
              <View key={k} style={[s.filaTabla, { paddingVertical: 4 }]} wrap={false}>
                <Text style={{ width: 130, color: C.muted }}>{k}</Text>
                <Text style={[{ flex: 1 }, k === "Serie" || k === "BIOS" ? s.mono : {}]}>{v}</Text>
              </View>
            ))}
          </Seccion>
        ) : null}

        {f.diagnosticos.length ? (
          <Seccion n={sig()} titulo="Diagnóstico inicial">
            <View style={s.cabTabla}>
              <Text style={{ width: 150, paddingLeft: 6 }}>Elemento</Text>
              <Text style={{ flex: 1 }}>Resultado</Text>
              <Text style={{ width: 70, textAlign: "right", paddingRight: 6 }}>Estado</Text>
            </View>
            {f.diagnosticos.map((d, k) => (
              <View key={k} style={[s.filaTabla, { alignItems: "center" }]} wrap={false}>
                <Text style={{ width: 150, paddingLeft: 6, paddingRight: 10, fontWeight: 600 }}>{d.elemento}</Text>
                <Text style={{ flex: 1, color: C.muted, paddingRight: 6 }}>{d.resultado}</Text>
                <View style={{ width: 70, alignItems: "flex-end", paddingRight: 6 }}>
                  <Pildora texto={etiquetaDe(ESTADOS_DIAGNOSTICO, d.estado)} {...PILDORA_DIAG[d.estado]} />
                </View>
              </View>
            ))}
          </Seccion>
        ) : null}

        {f.trabajos.length ? (
          <Seccion n={sig()} titulo="Trabajos realizados">
            {filasTrabajos.map((fila, k) => (
              <View key={k} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }} wrap={false}>
                {fila.map((t, j) => (
                  <View key={j} style={{ width: "24%", borderWidth: 0.6, borderColor: C.line, borderRadius: 4, padding: 7 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Marca hecho={t.hecho} />
                      <Text style={{ fontWeight: 600, fontSize: 8.5, flex: 1 }}>{t.titulo}</Text>
                    </View>
                    {t.detalle ? <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 2 }}>{t.detalle}</Text> : null}
                  </View>
                ))}
              </View>
            ))}
          </Seccion>
        ) : null}

        {f.incidencias.length ? (
          <Seccion n={sig()} titulo="Incidencias atendidas">
            {f.incidencias.map((x, k) => (
              <View key={k} style={{ borderWidth: 0.6, borderColor: C.line, borderRadius: 4, padding: 9, marginBottom: 6 }} wrap={false}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontWeight: 600, flex: 1, paddingRight: 8 }}>{x.titulo}</Text>
                  <Pildora texto={etiquetaDe(ESTADOS_INCIDENCIA, x.estado)} {...PILDORA_INC[x.estado]} />
                </View>
                {x.causa ? (
                  <Text style={{ fontSize: 8.5 }}>
                    <Text style={{ color: C.muted }}>Causa: </Text>
                    {x.causa}
                  </Text>
                ) : null}
                {x.solucion ? (
                  <Text style={{ fontSize: 8.5, marginTop: 2 }}>
                    <Text style={{ color: C.mintInk }}>Solución: </Text>
                    {x.solucion}
                  </Text>
                ) : null}
              </View>
            ))}
          </Seccion>
        ) : null}

        {f.recomendaciones.length ? (
          <Seccion n={sig()} titulo="Recomendaciones" juntos={f.recomendaciones.length <= 8}>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {f.recomendaciones.map((r, k) => (
                <View key={k} style={{ width: "50%", flexDirection: "row", paddingRight: 10, marginBottom: 5 }} wrap={false}>
                  <Text style={[s.mono, { color: C.mintInk, width: 18 }]}>{String(k + 1).padStart(2, "0")}</Text>
                  <Text style={{ flex: 1 }}>{r}</Text>
                </View>
              ))}
            </View>
            {f.proximo_mantenimiento ? (
              <Text style={{ backgroundColor: C.soft, padding: 8, borderRadius: 4, marginTop: 6 }}>
                Próximo mantenimiento sugerido: <Text style={[s.mono, { fontWeight: 600 }]}>{formatearFecha(f.proximo_mantenimiento)}</Text>
              </Text>
            ) : null}
          </Seccion>
        ) : null}

        <Seccion n={sig()} titulo="Conformidad" juntos>
          <View style={{ flexDirection: "row", gap: 32, marginTop: 30 }}>
            <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4 }}>
              <Text style={{ fontWeight: 600 }}>{marca?.responsable ?? nombreMarca}</Text>
              <Text style={{ color: C.muted, fontSize: 8.5 }}>{marca ? `${marca.cargo} · ${nombreMarca}` : nombreMarca}</Text>
            </View>
            <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4 }}>
              <Text style={{ fontWeight: 600 }}>{f.cliente.contacto ?? "Nombre y firma"}</Text>
              <Text style={{ color: C.muted, fontSize: 8.5 }}>{f.cliente.nombre}</Text>
            </View>
          </View>
          <View style={{ marginTop: 24, backgroundColor: C.ink, color: "#FFFFFF", borderRadius: 6, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontWeight: 600, fontSize: 11 }}>¿Dudas sobre tu equipo? Escríbeme.</Text>
              <Text style={[s.mono, { color: "#AEB6C4", fontSize: 8.5, marginTop: 2 }]}>{contacto.length ? contacto.join("  ·  ") : "[PENDIENTE: contacto en Mi marca]"}</Text>
              {url ? <Text style={[s.mono, { color: C.mint, fontSize: 7.5, marginTop: 4 }]}>{url}</Text> : null}
            </View>
            {qr ? (
              <View style={{ backgroundColor: "#FFFFFF", padding: 3, borderRadius: 3 }}>
                {/* react-pdf Image no admite alt: el QR va acompañado del texto y la URL. */}
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={qr} style={{ width: 52, height: 52 }} />
              </View>
            ) : (
              <Logo variante="claro" alto={22} />
            )}
          </View>
        </Seccion>
      </Page>
    </Document>
  );
}

/** PDF de la ficha; con `url` (enlace del portal) agrega el QR de verificación. */
export async function pdfFicha(f: FichaJson, url: string | null): Promise<Uint8Array> {
  const qr = url ? await QRCode.toDataURL(url, { margin: 0, width: 240, color: { dark: "#0A0F1A", light: "#FFFFFF" } }) : null;
  const buffer = await renderToBuffer(<DocumentoFicha f={f} qr={qr} url={url} />);
  return new Uint8Array(buffer);
}
