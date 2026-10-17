import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { rotuloArea } from "@/lib/areas";
import { formatearFecha } from "@/lib/format";
import { bloques, textoPeriodo } from "@/lib/informe";
import type { InformeJson } from "@/lib/documentos";
import { C, Cabecera, Datos, Encabezado, Firmas, Pie, Seccion, contactoDe, registrarFuentes, s } from "./base";
import { Lista } from "./brief-acta-pdf";

function Indicadores({ items }: { items: InformeJson["indicadores"] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
      {items.map((x, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: C.soft, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 8 }}>
          <Text style={[s.mono, { fontSize: 12, fontWeight: 600, color: C.mintInk, lineHeight: 1.2 }]}>{x.valor}</Text>
          <Text style={{ fontWeight: 600, marginTop: 2 }}>{x.etiqueta}</Text>
          {x.nota ? <Text style={{ color: C.muted, fontSize: 8 }}>{x.nota}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function Contenido({ texto }: { texto: string }) {
  return (
    <View>
      {bloques(texto).map((b, i) =>
        b.tipo === "lista" ? (
          <View key={i} style={{ marginBottom: 6 }}>
            <Lista items={b.items} />
          </View>
        ) : (
          <Text key={i} style={{ marginBottom: 6 }}>
            {b.texto}
          </Text>
        ),
      )}
    </View>
  );
}

export function DocumentoInforme({ i }: { i: InformeJson }) {
  registrarFuentes();
  const area = rotuloArea(i.area);
  const nombreMarca = i.marca?.nombre_comercial ?? "aguemar";
  const periodo = textoPeriodo(i.periodo_inicio, i.periodo_fin);
  let n = 1;
  return (
    <Document title={`${i.numero ?? "Informe"} · ${i.cliente.nombre}`} author={nombreMarca} subject={i.titulo} creator="aguemar Studio" producer="aguemar Studio" language="es-PE">
      <Page size="A4" style={s.pagina}>
        <Encabezado izquierda={nombreMarca} derecha={`${i.numero ?? "BORRADOR"} · ${i.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />
        <Cabecera tipo="INFORME DE AVANCE" numero={i.numero} fecha={i.fecha} area={`${area} · ${periodo}`} titulo={i.titulo} resumen={i.resumen} />
        <Datos
          filas={[
            ["Empresa", i.cliente.nombre],
            ["Periodo", `${formatearFecha(i.periodo_inicio)} – ${formatearFecha(i.periodo_fin)}`],
            ["Proyecto", i.trabajo ?? "Todos"],
            ["Responsable", i.marca?.responsable ?? nombreMarca],
          ]}
        />
        {i.indicadores.length ? (
          <Seccion n={String(n++).padStart(2, "0")} titulo="Indicadores">
            <Indicadores items={i.indicadores} />
          </Seccion>
        ) : null}
        {i.secciones.map((x, k) => (
          <Seccion key={k} n={String(n++).padStart(2, "0")} titulo={x.titulo}>
            <Contenido texto={x.texto} />
          </Seccion>
        ))}
        <Seccion n={String(n++).padStart(2, "0")} titulo="Cierre" juntos>
          {/* Lo emite aguemar: una sola firma, sin la de la empresa. */}
          <Firmas firmas={[[i.marca?.responsable ?? nombreMarca, i.marca ? `${i.marca.cargo} · ${nombreMarca}` : nombreMarca]]} contacto={contactoDe(i.marca)} />
        </Seccion>
      </Page>
    </Document>
  );
}

export async function pdfInforme(i: InformeJson): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(<DocumentoInforme i={i} />));
}
