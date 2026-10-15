/**
 * Piezas comunes de los PDF de agueMar: fuentes, logo, corchetes, colores,
 * estilos y títulos de sección. Las usan la cotización y la ficha técnica.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Font, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

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

/** Corchetes < > decorativos de la marca. */
export function Corchetes({ ancho, opacidad }: { ancho: number; opacidad: number }) {
  return (
    <Svg viewBox="0 0 200 120" style={{ width: ancho, height: (ancho * 120) / 200 }}>
      <Path d="M70 10 L18 60 L70 110" stroke="#1CE783" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={opacidad} />
      <Path d="M130 10 L182 60 L130 110" stroke="#1CE783" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={opacidad} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Estilos: A4 (595 × 842 pt), márgenes laterales 42 pt (= 56 px a 96 dpi).
// ---------------------------------------------------------------------------
export const C = { ink: "#0A0F1A", mint: "#1CE783", mintInk: "#0A6B3B", mintSoft: "#E3FAEF", warn: "#7A4F00", warnSoft: "#FFF3DC", muted: "#4A5263", line: "#E2E5EB", soft: "#F5F7FA" };
export const M = 42;

export const s = StyleSheet.create({
  portada: { backgroundColor: C.ink, color: "#FFFFFF", fontFamily: "Sora", padding: M, paddingTop: 48 },
  pagina: { fontFamily: "Sora", fontSize: 9.5, color: C.ink, paddingTop: 78, paddingBottom: 64, paddingHorizontal: M, lineHeight: 1.45 },
  // Sin ligaduras: las contextuales de JetBrains Mono (p. ej. " //") rompen fontkit.
  mono: { fontFamily: "Mono", fontFeatureSettings: { calt: false, liga: false } },
  encabezado: { position: "absolute", top: 28, left: M, right: M, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 0.6, borderBottomColor: C.line, paddingBottom: 8 },
  // A4 mide 842 pt de alto: el pie se ancla desde arriba (bottom no se respeta en páginas que se parten).
  pie: { position: "absolute", top: 800, left: M, right: M, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
  seccion: { marginTop: 22 },
  tituloSeccion: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  numSeccion: { fontFamily: "Mono", fontFeatureSettings: { calt: false, liga: false }, fontWeight: 600, color: C.mintInk, fontSize: 9, marginRight: 8 },
  textoSeccion: { fontSize: 12, fontWeight: 600 },
  etiqueta: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  filaTabla: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 6 },
  cabTabla: { flexDirection: "row", backgroundColor: C.soft, paddingVertical: 5, fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 },
});

export function Seccion({ n, titulo, juntos, children }: { n: string; titulo: string; juntos?: boolean; children: React.ReactNode }) {
  return (
    // "juntos": la sección entera pasa a la página siguiente si no cabe (firmas y cierre).
    <View style={s.seccion} wrap={!juntos}>
      {/* minPresenceAhead evita títulos huérfanos al final de una página. */}
      <View style={s.tituloSeccion} minPresenceAhead={90} wrap={false}>
        <Text style={s.numSeccion}>{n}</Text>
        <Text style={s.textoSeccion}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}


/** Encabezado delgado de las páginas interiores (se repite en cada página). */
export function Encabezado({ derecha }: { derecha: string }) {
  return (
    <View style={s.encabezado} fixed>
      <Logo variante="oscuro" alto={16} />
      <Text style={[s.mono, { fontSize: 8, color: C.muted }]}>{derecha}</Text>
    </View>
  );
}

/** Pie: "agueMar · área" y "NN / TT". */
export function Pie({ izquierda }: { izquierda: string }) {
  return (
    <View style={s.pie} fixed>
      <Text>{izquierda}</Text>
      <Text style={s.mono} fixed render={({ pageNumber, totalPages }) => `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`} />
    </View>
  );
}
