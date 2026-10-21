/**
 * Piezas comunes de los PDF de aguemar: fuentes, logo, colores, cabecera,
 * estilos, títulos de sección y firmas. Las usan todos los documentos.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Font, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { formatearFecha } from "@/lib/format";
import { telefonoLegible } from "@/lib/landing";

// ---------------------------------------------------------------------------
// Fuentes de la marca (incluidas en el repo: src/lib/pdf/fuentes, licencia OFL).
// ---------------------------------------------------------------------------
const FUENTES = path.join(process.cwd(), "src", "lib", "pdf", "fuentes");
let fuentesListas = false;
export function registrarFuentes() {
  if (fuentesListas) return;
  Font.register({
    family: "Sora",
    fonts: [
      { src: path.join(FUENTES, "Sora_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FUENTES, "Sora_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FUENTES, "Sora_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Mono",
    fonts: [
      { src: path.join(FUENTES, "JetBrainsMono_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(FUENTES, "JetBrainsMono_600SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  // Sin cortes de palabra con guiones raros: se parte solo en espacios.
  Font.registerHyphenationCallback((palabra) => [palabra]);
  fuentesListas = true;
}

// Trazos del logo (public/logo-light.svg y logo.svg), leídos una vez.
type Trazo = { d: string; fill: string };
let trazos: { claro: Trazo[]; oscuro: Trazo[] } | null = null;
function trazosLogo() {
  if (trazos) return trazos;
  const leer = (archivo: string): Trazo[] => {
    const svg = readFileSync(path.join(process.cwd(), "public", archivo), "utf8");
    return [...svg.matchAll(/<path\b[^>]*>/g)].map((m) => ({
      d: /\sd="([^"]+)"/.exec(m[0])?.[1] ?? "",
      fill: /\sfill="([^"]+)"/.exec(m[0])?.[1] ?? "#0A0F1A",
    }));
  };
  trazos = { claro: leer("logo-light.svg"), oscuro: leer("logo.svg") };
  return trazos;
}

export function Logo({ variante, alto }: { variante: "claro" | "oscuro"; alto: number }) {
  const t = trazosLogo()[variante];
  return (
    <Svg viewBox="4470 12270 12720 5835" style={{ height: alto, width: (alto * 12720) / 5835 }}>
      {t.map((p, i) => (
        <Path key={i} d={p.d} fill={p.fill} />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Estilos: A4 (595 × 842 pt), márgenes laterales 42 pt (= 56 px a 96 dpi).
// Documentos sobrios: fondo blanco, una cabecera clara y sin portada.
// ---------------------------------------------------------------------------
export const C = { ink: "#0A0F1A", mint: "#1CE783", mintInk: "#0A6B3B", mintSoft: "#E3FAEF", warn: "#7A4F00", warnSoft: "#FFF3DC", muted: "#4A5263", line: "#E2E5EB", soft: "#F5F7FA" };
export const M = 42;

/** Tonos de las píldoras de estado (siempre claros). */
export const TONO = {
  ok: { fondo: C.mintSoft, color: C.mintInk },
  aviso: { fondo: C.warnSoft, color: C.warn },
  neutro: { fondo: C.soft, color: C.muted },
  error: { fondo: "#FDE8E8", color: "#9B1C1C" },
} as const;
export type Tono = { fondo: string; color: string };

export const s = StyleSheet.create({
  // Sin ligaduras en Sora: con "fi"/"fl" el texto seleccionable salía "Ofce", "frma" al copiarlo o buscarlo (UX-006).
  pagina: { fontFamily: "Sora", fontFeatureSettings: { liga: false }, fontSize: 9, color: C.ink, paddingTop: 40, paddingBottom: 56, paddingHorizontal: M, lineHeight: 1.4 },
  // Sin ligaduras: las contextuales de JetBrains Mono (p. ej. " //") rompen fontkit.
  mono: { fontFamily: "Mono", fontFeatureSettings: { calt: false, liga: false } },
  encabezado: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingBottom: 4, fontSize: 7.5, color: C.muted },
  // A4 mide 842 pt de alto: el pie se ancla desde arriba (bottom no se respeta en páginas que se parten).
  pie: { position: "absolute", top: 808, left: M, right: M, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: C.muted, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 5 },
  seccion: { marginTop: 9 },
  tituloSeccion: { flexDirection: "row", alignItems: "baseline", marginBottom: 5 },
  numSeccion: { fontFamily: "Mono", fontFeatureSettings: { calt: false, liga: false }, fontWeight: 600, color: C.mintInk, fontSize: 8, marginRight: 6 },
  textoSeccion: { fontSize: 10, fontWeight: 600 },
  etiqueta: { fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 },
  filaTabla: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4 },
  cabTabla: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: C.ink, paddingBottom: 3, fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 },
});

export function Seccion({ n, titulo, juntos, extra, children }: { n: string; titulo: string; juntos?: boolean; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    // "juntos": la sección entera pasa a la página siguiente si no cabe (firmas y cierre).
    <View style={s.seccion} wrap={!juntos}>
      {/* minPresenceAhead evita títulos huérfanos al final de una página. */}
      <View style={s.tituloSeccion} minPresenceAhead={60} wrap={false}>
        <Text style={s.numSeccion}>{n}</Text>
        <Text style={s.textoSeccion}>{titulo}</Text>
        {extra ? <View style={{ marginLeft: "auto" }}>{extra}</View> : null}
      </View>
      {children}
    </View>
  );
}

export function Pildora({ texto, fondo, color }: { texto: string } & Tono) {
  return <Text style={{ backgroundColor: fondo, color, fontSize: 7, fontWeight: 600, paddingVertical: 1, paddingHorizontal: 6, borderRadius: 6 }}>{texto}</Text>;
}

/**
 * Cabecera de la primera página: logo a la izquierda; tipo, número y fecha a
 * la derecha (y opcionalmente un QR); debajo, área, estado, titular y resumen.
 */
export function Cabecera({ tipo, numero, fecha, area, titulo, resumen, estado, lateral }: {
  tipo: string;
  numero: string | null;
  fecha: string;
  area: string;
  titulo: string;
  resumen?: string | null;
  estado?: { texto: string } & Tono;
  lateral?: React.ReactNode;
}) {
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottomWidth: 0.6, borderBottomColor: C.line }}>
        <Logo variante="oscuro" alto={20} />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[s.mono, { fontSize: 7.5, color: C.muted, letterSpacing: 0.6 }]}>{tipo}</Text>
            <Text style={[s.mono, { fontSize: 10.5, fontWeight: 600 }]}>{numero ?? "BORRADOR"}</Text>
            <Text style={[s.mono, { fontSize: 8, color: C.muted }]}>{formatearFecha(fecha)}</Text>
          </View>
          {lateral ? <View style={{ marginLeft: 10 }}>{lateral}</View> : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
        <Text style={[s.mono, { fontSize: 8, color: C.mintInk, marginRight: 8 }]}>{area}</Text>
        {estado ? <Pildora {...estado} /> : null}
      </View>
      <Text style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25, marginTop: 3 }}>{titulo}</Text>
      {resumen ? <Text style={{ color: C.muted, marginTop: 3 }}>{resumen}</Text> : null}
    </View>
  );
}

/** Datos sueltos en columnas (etiqueta arriba, valor abajo), sin cajas. */
export function Datos({ filas, columnas = 4 }: { filas: [string, string][]; columnas?: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }} wrap={false}>
      {filas.map(([k, v]) => (
        <View key={k} style={{ width: `${100 / columnas}%`, paddingRight: 8, marginBottom: 6 }}>
          <Text style={s.etiqueta}>{k}</Text>
          <Text>{v}</Text>
        </View>
      ))}
    </View>
  );
}

/** Teléfono, correo y web de la marca, solo los que existan. */
export function contactoDe(marca: { telefono: string | null; correo: string | null; web: string | null } | null): string[] {
  return [telefonoLegible(marca?.telefono), marca?.correo, marca?.web].filter(Boolean) as string[];
}

/** Firmas de conformidad (una o dos), una línea de contacto debajo y, a la derecha, algo opcional (el QR). */
export function Firmas({ firmas, contacto, nota, lateral, espacio = 30 }: { firmas: [string, string][]; contacto: string[]; nota?: string | null; lateral?: React.ReactNode; espacio?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", marginTop: espacio }}>
          {firmas.map(([nombre, detalle], i) => (
            <View key={i} style={{ width: 200, marginRight: 24, borderTopWidth: 0.6, borderTopColor: C.ink, paddingTop: 3 }}>
              <Text style={{ fontWeight: 600 }}>{nombre}</Text>
              <Text style={{ color: C.muted, fontSize: 8 }}>{detalle}</Text>
            </View>
          ))}
        </View>
        {/* Sin contacto en Mi marca la línea se omite: un documento nunca lleva marcadores. */}
        {contacto.length || nota ? (
          <Text style={[s.mono, { fontSize: 7.5, color: C.muted, marginTop: 10 }]}>{[...contacto, ...(nota ? [nota] : [])].join("  ·  ")}</Text>
        ) : null}
      </View>
      {lateral}
    </View>
  );
}

/** Encabezado delgado de las páginas siguientes (la primera lleva la cabecera). */
export function Encabezado({ izquierda, derecha }: { izquierda: string; derecha: string }) {
  return (
    <View
      fixed
      style={{ position: "absolute", top: 18, left: M, right: M }}
      render={({ pageNumber }) =>
        pageNumber > 1 ? (
          <View style={s.encabezado}>
            <Text style={{ fontWeight: 600, color: C.ink }}>{izquierda}</Text>
            <Text style={s.mono}>{derecha}</Text>
          </View>
        ) : null
      }
    />
  );
}

/** Pie: "aguemar · área" y "NN / TT". */
export function Pie({ izquierda }: { izquierda: string }) {
  return (
    <View style={s.pie} fixed>
      <Text>{izquierda}</Text>
      <Text style={s.mono} fixed render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`} />
    </View>
  );
}
