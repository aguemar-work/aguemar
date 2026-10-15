import { Document, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { rotuloArea } from "@/lib/areas";
import { formatearFecha } from "@/lib/format";
import { lineas, type ActaJson, type BriefJson, type MarcaJson } from "@/lib/documentos";
import { C, Corchetes, Encabezado, Logo, Pie, Seccion, registrarFuentes, s } from "./base";
import { telefonoLegible } from "@/lib/landing";

export function Portada({ tipo, numero, fecha, area, titulo, resumen, pildora, empresa, marca }: {
  tipo: string;
  numero: string | null;
  fecha: string;
  area: string;
  titulo: string;
  resumen?: string | null;
  pildora?: { texto: string; fondo: string; color: string };
  empresa: string;
  marca: MarcaJson | null;
}) {
  const contacto = [telefonoLegible(marca?.telefono), marca?.correo, marca?.web].filter(Boolean) as string[];
  return (
    <Page size="A4" style={s.portada}>
      <View style={{ position: "absolute", top: 18, right: 0 }}>
        <Corchetes ancho={300} opacidad={0.12} />
      </View>
      <Logo variante="claro" alto={34} />
      <View style={{ flexGrow: 1 }} />
      <Text style={[s.mono, { fontSize: 9, color: "#AEB6C4", marginBottom: 10 }]}>
        {tipo} · {numero ?? "BORRADOR"} · {formatearFecha(fecha)}
      </Text>
      <Text style={[s.mono, { fontSize: 11, color: C.mint, marginBottom: 8 }]}>{area}</Text>
      <Text style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, marginBottom: 14 }}>{titulo}</Text>
      <Text style={{ fontSize: 11, color: "#C9CFDA", lineHeight: 1.5, maxWidth: 430 }}>{resumen ?? `Para ${empresa}.`}</Text>
      {pildora ? (
        <View style={{ flexDirection: "row", marginTop: 16 }}>
          <Text style={{ backgroundColor: pildora.fondo, color: pildora.color, fontSize: 9, fontWeight: 600, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 }}>{pildora.texto}</Text>
        </View>
      ) : null}
      <View style={{ marginTop: 56, borderTopWidth: 0.6, borderTopColor: "#2A3140", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: "#AEB6C4" }}>
        <Text>
          {marca?.nombre_comercial ?? "agueMar"}
          {marca?.ruc ? ` · RUC ${marca.ruc}` : ""}
        </Text>
        <Text style={s.mono}>{contacto.join("  ·  ")}</Text>
      </View>
    </Page>
  );
}

export function Datos({ filas }: { filas: [string, string][] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
      {filas.map(([k, v]) => (
        <View key={k} style={{ flex: 1, backgroundColor: C.soft, borderRadius: 4, padding: 8 }}>
          <Text style={s.etiqueta}>{k}</Text>
          <Text>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export function Lista({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((t, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 3 }} wrap={false}>
          <Text style={[s.mono, { color: C.mintInk, width: 16 }]}>›</Text>
          <Text style={{ flex: 1 }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export function Cierre({ marca, firmaCliente, empresa, aceptado }: { marca: MarcaJson | null; firmaCliente: string; empresa: string; aceptado?: string | null }) {
  const nombreMarca = marca?.nombre_comercial ?? "agueMar";
  const contacto = [telefonoLegible(marca?.telefono), marca?.correo, marca?.web].filter(Boolean) as string[];
  return (
    <View>
      {aceptado ? <Text style={{ backgroundColor: C.mintSoft, color: C.mintInk, padding: 8, borderRadius: 4, marginBottom: 12 }}>{aceptado}</Text> : null}
      <View style={{ flexDirection: "row", gap: 32, marginTop: 30 }}>
        <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4 }}>
          <Text style={{ fontWeight: 600 }}>{marca?.responsable ?? nombreMarca}</Text>
          <Text style={{ color: C.muted, fontSize: 8.5 }}>{marca ? `${marca.cargo} · ${nombreMarca}` : nombreMarca}</Text>
        </View>
        <View style={{ flex: 1, borderTopWidth: 0.8, borderTopColor: C.ink, paddingTop: 4 }}>
          <Text style={{ fontWeight: 600 }}>{firmaCliente}</Text>
          <Text style={{ color: C.muted, fontSize: 8.5 }}>{empresa}</Text>
        </View>
      </View>
      <View style={{ marginTop: 24, backgroundColor: C.ink, color: "#FFFFFF", borderRadius: 6, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontWeight: 600, fontSize: 11 }}>¿Dudas? Conversemos.</Text>
          <Text style={[s.mono, { color: "#AEB6C4", fontSize: 8.5, marginTop: 2 }]}>{contacto.length ? contacto.join("  ·  ") : "[PENDIENTE: contacto en Mi marca]"}</Text>
        </View>
        <Logo variante="claro" alto={22} />
      </View>
    </View>
  );
}

export function DocumentoBrief({ b }: { b: BriefJson }) {
  registrarFuentes();
  const area = rotuloArea(b.area);
  const nombreMarca = b.marca?.nombre_comercial ?? "agueMar";
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
    <Document title={`${b.numero ?? "Brief"} · ${b.cliente.nombre}`} author={nombreMarca} subject={b.titulo} creator="agueMar Studio" producer="agueMar Studio" language="es-PE">
      <Portada tipo="BRIEF" numero={b.numero} fecha={b.fecha} area={area} titulo={b.titulo} resumen={b.objetivo ? b.objetivo.split(/\r?\n/)[0] : null} empresa={b.cliente.nombre} marca={b.marca} />
      <Page size="A4" style={s.pagina}>
        <Encabezado derecha={`${b.numero ?? "BORRADOR"} · ${b.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />
        <Seccion n="00" titulo="Datos">
          <Datos
            filas={[
              ["Empresa", b.cliente.nombre],
              ["Fecha", formatearFecha(b.fecha)],
              ["Entrega estimada", b.fecha_entrega ? formatearFecha(b.fecha_entrega) : "Por definir"],
              ["Responsable", b.marca?.responsable ?? nombreMarca],
            ]}
          />
        </Seccion>
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
  const nombreMarca = a.marca?.nombre_comercial ?? "agueMar";
  return (
    <Document title={`${a.numero ?? "Acta de entrega"} · ${a.cliente.nombre}`} author={nombreMarca} subject={a.titulo} creator="agueMar Studio" producer="agueMar Studio" language="es-PE">
      <Portada
        tipo="ACTA DE ENTREGA"
        numero={a.numero}
        fecha={a.fecha}
        area={area}
        titulo={a.titulo}
        resumen={a.resumen}
        empresa={a.cliente.nombre}
        marca={a.marca}
        pildora={a.aceptacion ? { texto: "Conforme", fondo: C.mint, color: C.ink } : { texto: "Por aceptar", fondo: "#2A3140", color: "#FFFFFF" }}
      />
      <Page size="A4" style={s.pagina}>
        <Encabezado derecha={`${a.numero ?? "BORRADOR"} · ${a.cliente.nombre}`} />
        <Pie izquierda={`${nombreMarca} · ${area.replace("// ", "")}`} />
        <Seccion n="00" titulo="Datos">
          <Datos
            filas={[
              ["Empresa", a.cliente.nombre],
              ["Fecha", formatearFecha(a.fecha)],
              ["Trabajo", a.trabajo ?? "—"],
              ["Entrega", a.marca?.responsable ?? nombreMarca],
            ]}
          />
        </Seccion>
        <Seccion n="01" titulo="Entregables">
          <View style={s.cabTabla}>
            <Text style={{ width: 26, paddingLeft: 6 }}>N°</Text>
            <Text style={{ flex: 1 }}>Entregable</Text>
          </View>
          {a.entregables.map((e, i) => (
            <View key={i} style={s.filaTabla} wrap={false}>
              <Text style={[s.mono, { width: 26, paddingLeft: 6, color: C.mintInk }]}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 600 }}>{e.nombre}</Text>
                {e.detalle ? <Text style={{ color: C.muted, fontSize: 8.5 }}>{e.detalle}</Text> : null}
                {e.url ? <Text style={[s.mono, { color: C.mintInk, fontSize: 8 }]}>{e.url}</Text> : null}
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
