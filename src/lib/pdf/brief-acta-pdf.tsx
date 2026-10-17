import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { rotuloArea } from "@/lib/areas";
import { formatearFecha } from "@/lib/format";
import { lineas, type ActaJson, type BriefJson, type MarcaJson } from "@/lib/documentos";
import { C, Cabecera, Datos, Encabezado, Firmas, Pie, Seccion, TONO, contactoDe, registrarFuentes, s } from "./base";

export function Lista({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 3 }} wrap={false}>
          <Text style={{ color: C.muted, width: 10 }}>·</Text>
          <Text style={{ flex: 1 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export function Cierre({ marca, firmaCliente, empresa, aceptado }: { marca: MarcaJson | null; firmaCliente: string; empresa: string; aceptado?: string | null }) {
  const nombreMarca = marca?.nombre_comercial ?? "aguemar";
  return (
    <View>
      {aceptado ? <Text style={{ color: C.mintInk, marginTop: 4 }}>{aceptado}</Text> : null}
      <Firmas
        firmas={[
          [marca?.responsable ?? nombreMarca, marca ? `${marca.cargo} · ${nombreMarca}` : nombreMarca],
          [firmaCliente, empresa],
        ]}
        contacto={contactoDe(marca)}
      />
    </View>
  );
}

export function DocumentoBrief({ b }: { b: BriefJson }) {
  registrarFuentes();
  const area = rotuloArea(b.area);
  const nombreMarca = b.marca?.nombre_comercial ?? "aguemar";
  const secciones: [string, string | null, "texto" | "lista"][] = [
    ["Objetivo", b.objetivo, "texto"],
    ["Contexto", b.contexto, "texto"],
    ["Público", b.publico, "texto"],
    ["Alcance", b.alcance, "lista"],
    ["Fuera del alcance", b.fuera_alcance, "lista"],
    ["Entregables", b.entregables, "lista"],
    ["Referencias", b.referencias, "lista"],
  ];
  let n = 1;
  return (
    <Document title={`${b.numero ?? "Brief"} · ${b.cliente.nombre}`} author={nombreMarca} subject={b.titulo} creator="aguemar Studio" producer="aguemar Studio" language="es-PE">
      <Page size="A4" style={s.pagina}>
        <Encabezado izquierda={nombreMarca} derecha={`${b.numero ?? "BORRADOR"} · ${b.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />
        <Cabecera tipo="BRIEF" numero={b.numero} fecha={b.fecha} area={area} titulo={b.titulo} />
        <Datos
          filas={[
            ["Empresa", b.cliente.nombre],
            ["Fecha", formatearFecha(b.fecha)],
            ["Entrega estimada", b.fecha_entrega ? formatearFecha(b.fecha_entrega) : "Por definir"],
            ["Responsable", b.marca?.responsable ?? nombreMarca],
          ]}
        />
        {secciones
          .filter(([, v]) => v && v.trim())
          .map(([titulo, v, tipo]) => (
            <Seccion key={titulo} n={String(n++).padStart(2, "0")} titulo={titulo}>
              {tipo === "lista" ? <Lista items={lineas(v)} /> : <Text>{v}</Text>}
            </Seccion>
          ))}
        <Seccion n={String(n++).padStart(2, "0")} titulo="Conformidad" juntos>
          <Cierre marca={b.marca} firmaCliente={b.cliente.contacto ?? "Nombre y firma"} empresa={b.cliente.nombre} />
        </Seccion>
      </Page>
    </Document>
  );
}

export function DocumentoActa({ a }: { a: ActaJson }) {
  registrarFuentes();
  const area = rotuloArea(a.area);
  const nombreMarca = a.marca?.nombre_comercial ?? "aguemar";
  return (
    <Document title={`${a.numero ?? "Acta de entrega"} · ${a.cliente.nombre}`} author={nombreMarca} subject={a.titulo} creator="aguemar Studio" producer="aguemar Studio" language="es-PE">
      <Page size="A4" style={s.pagina}>
        <Encabezado izquierda={nombreMarca} derecha={`${a.numero ?? "BORRADOR"} · ${a.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />
        <Cabecera
          tipo="ACTA DE ENTREGA"
          numero={a.numero}
          fecha={a.fecha}
          area={area}
          titulo={a.titulo}
          resumen={a.resumen}
          estado={a.aceptacion ? { texto: "Conforme", ...TONO.ok } : { texto: "Por aceptar", ...TONO.aviso }}
        />
        <Datos
          filas={[
            ["Empresa", a.cliente.nombre],
            ["Fecha", formatearFecha(a.fecha)],
            ["Trabajo", a.trabajo ?? "—"],
            ["Entrega", a.marca?.responsable ?? nombreMarca],
          ]}
        />
        <Seccion n="01" titulo="Entregables">
          <View style={s.cabTabla}>
            <Text style={{ width: 22 }}>N°</Text>
            <Text style={{ flex: 1 }}>Entregable</Text>
          </View>
          {a.entregables.map((e, i) => (
            <View key={i} style={s.filaTabla} wrap={false}>
              <Text style={[s.mono, { width: 22, color: C.muted }]}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 600 }}>{e.nombre}</Text>
                {e.detalle ? <Text style={{ color: C.muted, fontSize: 8 }}>{e.detalle}</Text> : null}
                {e.url ? <Text style={[s.mono, { color: C.mintInk, fontSize: 7.5 }]}>{e.url}</Text> : null}
              </View>
            </View>
          ))}
        </Seccion>
        {a.observaciones ? (
          <Seccion n="02" titulo="Observaciones">
            <Text>{a.observaciones}</Text>
          </Seccion>
        ) : null}
        <Seccion n={a.observaciones ? "03" : "02"} titulo="Conformidad" juntos>
          <Text>Con la firma de este documento, {a.cliente.nombre} declara haber recibido los entregables listados a su conformidad.</Text>
          <Cierre
            marca={a.marca}
            firmaCliente={a.aceptacion?.nombre ?? a.cliente.contacto ?? "Nombre y firma"}
            empresa={a.cliente.nombre}
            aceptado={
              a.aceptacion
                ? `Recibido conforme por ${a.aceptacion.nombre}${a.aceptacion.dni ? ` (DNI ${a.aceptacion.dni})` : ""} el ${formatearFecha(a.aceptacion.aceptado_en)}.`
                : null
            }
          />
        </Seccion>
      </Page>
    </Document>
  );
}

export async function pdfBrief(b: BriefJson): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(<DocumentoBrief b={b} />));
}

export async function pdfActa(a: ActaJson): Promise<Uint8Array> {
  return new Uint8Array(await renderToBuffer(<DocumentoActa a={a} />));
}
