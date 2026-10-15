import { CheckCircle2, ExternalLink } from "lucide-react";
import { rotuloArea } from "@/lib/areas";
import { lineas, type ActaJson, type BriefJson } from "@/lib/documentos";
import { formatearFecha, formatearFechaHora } from "@/lib/format";

/** Portada oscura común de los documentos en pantalla. */
export function Portada({ tipo, numero, fecha, area, titulo, resumen, pildora }: { tipo: string; numero: string | null; fecha: string; area: string; titulo: string; resumen?: string | null; pildora?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden rounded-xl bg-ink p-6 text-white sm:p-8">
      <svg aria-hidden viewBox="0 0 200 120" className="pointer-events-none absolute -right-6 -top-4 w-48 text-mint opacity-[0.12]" fill="none">
        <path d="M70 10 L18 60 L70 110 M130 10 L182 60 L130 110" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="font-mono text-xs text-white/60">
        {tipo} · {numero} · {formatearFecha(fecha)}
      </p>
      <p className="mt-2 font-mono text-sm text-mint">{area}</p>
      <h2 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">{titulo}</h2>
      {resumen ? <p className="mt-3 max-w-2xl text-sm text-white/75">{resumen}</p> : null}
      {pildora}
    </header>
  );
}

export function Seccion({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-baseline gap-2 text-base font-semibold">
        <span className="font-mono text-xs text-mint-ink dark:text-mint">{n}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function Lista({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="font-mono text-mint-ink dark:text-mint">›</span>
          <EnlaceOTexto texto={t} />
        </li>
      ))}
    </ul>
  );
}

/** Si la línea empieza con un enlace, lo vuelve clicable. */
export function EnlaceOTexto({ texto }: { texto: string }) {
  const m = /^(https?:\/\/\S+)(.*)$/i.exec(texto);
  if (!m) return <span>{texto}</span>;
  return (
    <span>
      <a href={m[1]} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">
        {m[1]}
      </a>
      {m[2]}
    </span>
  );
}

export function VistaBrief({ b }: { b: BriefJson }) {
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
    <div className="space-y-8">
      <Portada tipo="BRIEF" numero={b.numero} fecha={b.fecha} area={rotuloArea(b.area)} titulo={b.titulo} />
      <Seccion n="00" titulo="Datos">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Dato k="Empresa" v={b.cliente.nombre} />
          <Dato k="Fecha" v={formatearFecha(b.fecha)} />
          <Dato k="Entrega estimada" v={b.fecha_entrega ? formatearFecha(b.fecha_entrega) : "Por definir"} />
          <Dato k="Responsable" v={b.marca ? b.marca.responsable : "—"} />
        </dl>
      </Seccion>
      {secciones
        .filter(([, v]) => v && v.trim())
        .map(([titulo, v, tipo]) => (
          <Seccion key={titulo} n={String(n++).padStart(2, "0")} titulo={titulo}>
            {tipo === "lista" ? <Lista items={lineas(v)} /> : <p className="whitespace-pre-line text-sm">{v}</p>}
          </Seccion>
        ))}
    </div>
  );
}

export function VistaActa({ a }: { a: ActaJson }) {
  return (
    <div className="space-y-8">
      <Portada
        tipo="ACTA DE ENTREGA"
        numero={a.numero}
        fecha={a.fecha}
        area={rotuloArea(a.area)}
        titulo={a.titulo}
        resumen={a.resumen}
        pildora={
          <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${a.aceptacion ? "bg-mint text-ink" : "bg-white/10 text-white"}`}>
            {a.aceptacion ? "Conforme" : "Por aceptar"}
          </span>
        }
      />
      <Seccion n="00" titulo="Datos">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Dato k="Empresa" v={a.cliente.nombre} />
          <Dato k="Fecha" v={formatearFecha(a.fecha)} />
          <Dato k="Trabajo" v={a.trabajo ?? "—"} />
          <Dato k="Entrega" v={a.marca ? a.marca.responsable : "—"} />
        </dl>
      </Seccion>
      <Seccion n="01" titulo="Entregables">
        <ul className="divide-y divide-border rounded-lg border border-border text-sm">
          {a.entregables.map((e, i) => (
            <li key={i} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
              <span className="font-mono text-xs text-mint-ink dark:text-mint sm:pt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.nombre}</p>
                {e.detalle ? <p className="text-muted-foreground">{e.detalle}</p> : null}
              </div>
              {e.url ? (
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-xs underline underline-offset-4">
                  <ExternalLink className="size-3.5" aria-hidden /> Abrir
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </Seccion>
      {a.observaciones ? (
        <Seccion n="02" titulo="Observaciones">
          <p className="whitespace-pre-line text-sm">{a.observaciones}</p>
        </Seccion>
      ) : null}
      {a.aceptacion ? (
        <p className="flex items-start gap-2 rounded-lg bg-success-bg p-4 text-sm text-success-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          Recibido conforme por {a.aceptacion.nombre}
          {a.aceptacion.dni ? ` (DNI ${a.aceptacion.dni})` : ""} el {formatearFechaHora(a.aceptacion.aceptado_en)}.
        </p>
      ) : null}
    </div>
  );
}

export function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-soft p-3 dark:bg-secondary/50">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
