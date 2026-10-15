import { rotuloArea } from "@/lib/areas";
import { bloques, textoPeriodo } from "@/lib/informe";
import type { InformeJson } from "@/lib/documentos";
import { formatearFecha } from "@/lib/format";
import { Dato, EnlaceOTexto, Lista, Portada, Seccion } from "./vista-brief-acta";

/** Texto de una sección: párrafos y listas (líneas con "-"). */
export function TextoSeccion({ texto }: { texto: string }) {
  return (
    <div className="space-y-3 text-sm">
      {bloques(texto).map((b, i) =>
        b.tipo === "lista" ? (
          <Lista key={i} items={b.items} />
        ) : (
          <p key={i} className="whitespace-pre-line">
            <EnlaceOTexto texto={b.texto} />
          </p>
        ),
      )}
    </div>
  );
}

/** Informe de avance en pantalla (panel, workspace y portal). */
export function VistaInforme({ i }: { i: InformeJson }) {
  const periodo = textoPeriodo(i.periodo_inicio, i.periodo_fin);
  let n = 1;
  return (
    <div className="space-y-8">
      <Portada
        tipo="INFORME DE AVANCE"
        numero={i.numero}
        fecha={i.fecha}
        area={rotuloArea(i.area)}
        titulo={i.titulo}
        resumen={i.resumen}
        pildora={<span className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white">{periodo}</span>}
      />
      <Seccion n="00" titulo="Datos">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Dato k="Empresa" v={i.cliente.nombre} />
          <Dato k="Periodo" v={`${formatearFecha(i.periodo_inicio)} – ${formatearFecha(i.periodo_fin)}`} />
          <Dato k="Proyecto" v={i.trabajo ?? "Todos"} />
          <Dato k="Responsable" v={i.marca ? i.marca.responsable : "—"} />
        </dl>
      </Seccion>
      {i.indicadores.length ? (
        <Seccion n={String(n++).padStart(2, "0")} titulo="Indicadores">
          <ul className={`grid gap-3 ${i.indicadores.length > 2 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
            {i.indicadores.map((x, k) => (
              <li key={k} className="rounded-lg border border-border p-4">
                <p className="font-mono text-2xl font-semibold text-mint-ink tabular dark:text-mint">{x.valor}</p>
                <p className="mt-1 text-sm font-medium">{x.etiqueta}</p>
                {x.nota ? <p className="mt-0.5 text-xs text-muted-foreground">{x.nota}</p> : null}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}
      {i.secciones.map((s, k) => (
        <Seccion key={k} n={String(n++).padStart(2, "0")} titulo={s.titulo}>
          <TextoSeccion texto={s.texto} />
        </Seccion>
      ))}
    </div>
  );
}
