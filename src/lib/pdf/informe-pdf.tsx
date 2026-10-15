import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { rotuloArea } from "@/lib/areas";
import { formatearFecha } from "@/lib/format";
import { bloques, textoPeriodo } from "@/lib/informe";
import type { InformeJson } from "@/lib/documentos";
import { C, Encabezado, Logo, Pie, Seccion, registrarFuentes, s } from "./base";
import { Datos, Lista, Portada } from "./brief-acta-pdf";

function Indicadores({ items }: { items: InformeJson["indicadores"] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
      {items.map((x, i) => (
        <View key={i} style={{ flex: 1, borderWidth: 0.6, borderColor: C.line, borderRadius: 4, padding: 10 }}>
          <Text style={[s.mono, { fontSize: 18, fontWeight: 600, color: C.mintInk, lineHeight: 1.2 }]}>{x.valor}</Text>
          <Text style={{ fontWeight: 600, marginTop: 4 }}>{x.etiqueta}</Text>
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

/** Cierre del informe: quién lo emite y cómo contactarlo (no requiere firma de la empresa). */
function Cierre({ i }: { i: InformeJson }) {
  const marca = i.marca;
  const nombreMarca = marca?.nombre_comercial ?? "agueMar";
  const contacto = [marca?.telefono, marca?.correo, marca?.web].filter(Boolean) as string[];
  return (
    <View>
      <View style={{ width: 220, marginTop: 30, borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4 }}>
        <Text style={{ fontWeight: 600 }}>{marca?.responsable ?? nombreMarca}</Text>
        <Text style={{ color: C.muted, fontSize: 8.5 }}>{marca ? `${marca.cargo} · ${nombreMarca}` : nombreMarca}</Text>
      </View>
      <View style={{ marginTop: 24, backgroundColor: C.ink, color: "#FFFFFF", borderRadius: 6, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontWeight: 600, fontSize: 11 }}>¿Comentarios sobre el informe? Conversemos.</Text>
          <Text style={[s.mono, { color: "#AEB6C4", fontSize: 8.5, marginTop: 2 }]}>{contacto.length ? contacto.join("  ·  ") : "[PENDIENTE: contacto en Mi marca]"}</Text>
        </View>
        <Logo variante="claro" alto={22} />
      </View>
    </View>
  );
}

export function DocumentoInforme({ i }: { i: InformeJson }) {
  registrarFuentes();
  const area = rotuloArea(i.area);
  const nombreMarca = i.marca?.nombre_comercial ?? "agueMar";
  const periodo = textoPeriodo(i.periodo_inicio, i.periodo_fin);
  let n = 1;
  return (
    <Document title={`${i.numero ?? "Informe"} · ${i.cliente.nombre}`} author={nombreMarca} subject={i.titulo} creator="agueMar Studio" producer="agueMar Studio" language="es-PE">
      <Portada
        tipo="INFORME DE AVANCE"
        numero={i.numero}
        fecha={i.fecha}
        area={area}
        titulo={i.titulo}
        resumen={i.resumen}
        empresa={i.cliente.nombre}
        marca={i.marca}
        pildora={{ texto: periodo, fondo: "#2A3140", color: "#FFFFFF" }}
      />
      <Page size="A4" style={s.pagina}>
        <Encabezado derecha={`${i.numero ?? "BORRADOR"} · ${i.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />
        <Seccion n="00" titulo="Datos">
          <Datos
            filas={[
              ["Empresa", i.cliente.nombre],
              ["Periodo", `${formatearFecha(i.periodo_inicio)} – ${formatearFecha(i.periodo_fin)}`],
              ["Proyecto", i.trabajo ?? "Todos"],
              ["Responsable", i.marca?.responsable ?? nombreMarca],
            ]}
          />
        </Seccion>
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
          <Cierre i={i} />
        </Seccion>
      </Page>
    </Document>
  );
}

export async function pdfInforme(i: InformeJson): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(<DocumentoInforme i={i} />));
}
