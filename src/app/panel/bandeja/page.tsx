import type { Metadata } from "next";
import Link from "@/components/panel/enlace";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { bandejaComentarios, titulosDeCotizaciones, titulosDeTrabajos } from "@/lib/datos/comentarios";
import { formatearFechaHora } from "@/lib/format";
import { BotonLeido } from "./boton-leido";
import { RespuestaEnLinea } from "./respuesta-en-linea";
import { TarjetaSolicitud } from "./solicitud";
import { listarSolicitudes } from "@/lib/datos/calendario";
import { obtenerRol } from "@/lib/insforge/server";

export const metadata: Metadata = { title: "Bandeja" };

export default async function BandejaPage({ searchParams }: { searchParams: Promise<{ todos?: string }> }) {
  const { todos } = await searchParams;
  const rol = await obtenerRol();
  // El colaborador ve y responde comentarios de sus empresas; las solicitudes (que se vuelven trabajo o cotización) son del propietario.
  const propietario = rol.tipo === "propietario";
  const [comentarios, solicitudes] = await Promise.all([bandejaComentarios(!todos), propietario ? listarSolicitudes(!todos) : Promise.resolve([])]);
  const [titulos, titulosCot] = await Promise.all([
    titulosDeTrabajos(comentarios.filter((c) => c.entidad === "trabajo").map((c) => c.entidad_id)),
    titulosDeCotizaciones(comentarios.filter((c) => c.entidad === "cotizacion").map((c) => c.entidad_id)),
  ]);

  return (
    <>
      <PageHeader
        codigo="08"
        titulo="Bandeja"
        descripcion={propietario ? "Solicitudes y comentarios de tus empresas. Responde, convierte una solicitud en trabajo o cotízala." : "Comentarios de tus empresas. Respóndelos o márcalos como leídos."}
        acciones={
          <Button asChild variant="outline" size="sm">
            <Link href={todos ? "/panel/bandeja" : "/panel/bandeja?todos=1"}>{todos ? "Ver solo no leídos" : "Ver todos"}</Link>
          </Button>
        }
      />
      {propietario ? (
      <section aria-labelledby="t-solicitudes" className="mb-8">
        <h2 id="t-solicitudes" className="mb-3 text-base font-semibold">
          Solicitudes <span className="font-mono text-sm text-muted-foreground">({solicitudes.length})</span>
        </h2>
        {solicitudes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {todos ? "Ninguna empresa ha enviado solicitudes." : "No hay solicitudes por atender. Las empresas con el módulo Solicitudes pueden pedirte trabajos desde su espacio."}
          </p>
        ) : (
          <ul className="space-y-2">
            {solicitudes.map((s) => (
              <TarjetaSolicitud key={s.id} s={s} />
            ))}
          </ul>
        )}
      </section>
      ) : null}

      <h2 className="mb-3 text-base font-semibold">Comentarios</h2>
      {comentarios.length === 0 ? (
        <EmptyState icono={Inbox} titulo={todos ? "Sin comentarios." : "Nada pendiente de leer."} descripcion="Cuando una empresa comente un proyecto, lo verás aquí." />
      ) : (
        <ul className="space-y-2">
          {comentarios.map((c) => (
            <li key={c.id} className={`rounded-lg border p-4 ${c.leido ? "border-border" : "border-mint-ink/40 bg-mint-soft/40 dark:bg-success-bg/30"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {!c.leido ? (
                  <Badge variant="ok" dot>
                    Nuevo
                  </Badge>
                ) : null}
                <span className="font-medium text-foreground">{c.clientes?.nombre ?? "Empresa"}</span>
                <span>·</span>
                <span className="font-mono">{formatearFechaHora(c.created_at)}</span>
                <span>·</span>
                {c.entidad === "trabajo" ? (
                  <Link href={`/panel/trabajos/${c.entidad_id}`} className="underline-offset-4 hover:underline">
                    {titulos[c.entidad_id] ?? "Proyecto"}
                  </Link>
                ) : c.entidad === "actividad" ? (
                  <Link href={`/panel/calendario/${c.entidad_id}`} className="underline-offset-4 hover:underline">
                    Actividad del calendario
                  </Link>
                ) : c.entidad === "informe" ? (
                  <Link href={`/panel/informes/${c.entidad_id}`} className="underline-offset-4 hover:underline">
                    Informe de avance
                  </Link>
                ) : c.entidad === "cotizacion" ? (
                  <Link href={`/panel/cotizaciones/${c.entidad_id}#comentarios`} className="underline-offset-4 hover:underline">
                    {titulosCot[c.entidad_id] ?? "Cotización"}
                  </Link>
                ) : (
                  <span>{c.entidad}</span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{c.texto}</p>
              <div className="mt-3 flex flex-wrap items-start gap-2">
                <RespuestaEnLinea entidad={c.entidad} entidadId={c.entidad_id} clienteId={c.cliente_id} etiqueta={c.clientes?.nombre ?? "la empresa"} />
                <BotonLeido id={c.id} leido={c.leido} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
