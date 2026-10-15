import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Laptop } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaFicha } from "@/components/panel/etiquetas";
import { Badge } from "@/components/ui/badge";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { formatearFecha, hoyLima } from "@/lib/format";
import { textoVencimiento } from "@/lib/trabajos-util";

export const metadata: Metadata = { title: "Equipos" };

export default async function EquiposWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [empresa, equipos] = await Promise.all([ws.miEmpresa(), ws.equipos()]);
  if (!moduloActivo(empresa?.modulos, "equipos")) notFound();
  const hoy = hoyLima();

  return (
    <>
      <PageHeader codigo="04" titulo="Equipos" descripcion="El inventario de tus equipos y el historial de cada servicio." />
      {equipos.length === 0 ? (
        <EmptyState icono={Laptop} titulo="Aún no hay equipos registrados." descripcion="Cuando atendamos un equipo de tu empresa, aparecerá aquí con su historial." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {equipos.map((e) => {
            const ultima = e.fichas[0];
            const proximo = ultima?.proximo_mantenimiento;
            const venc = proximo ? textoVencimiento(proximo, hoy) : null;
            return (
              <article key={e.id} className="rounded-lg border border-border p-4">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{[e.marca, e.modelo].filter(Boolean).join(" ") || "Equipo"}</h2>
                    <Badge variant="mono" className="mt-1">
                      {e.serie}
                    </Badge>
                  </div>
                  <Laptop className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </header>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {(
                    [
                      ["Sistema", e.sistema_operativo],
                      ["Procesador", e.procesador],
                      ["RAM", e.ram],
                      ["Almacenamiento", e.almacenamiento],
                    ] as [string, string | null][]
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="truncate">{v}</dd>
                      </div>
                    ))}
                </dl>
                {proximo && venc ? (
                  <p className={`mt-3 flex items-center gap-2 rounded-md p-2 text-xs ${venc.tono === "danger" || venc.tono === "warn" ? "bg-warning-bg text-warning-foreground" : "bg-soft text-muted-foreground dark:bg-secondary/50"}`}>
                    <CalendarClock className="size-3.5" aria-hidden /> Próximo mantenimiento: {formatearFecha(proximo)} · {venc.texto.toLowerCase()}
                  </p>
                ) : null}
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historial</h3>
                {e.fichas.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">Sin servicios registrados todavía.</p>
                ) : (
                  <ul className="mt-1 divide-y divide-border text-sm">
                    {e.fichas.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                        <Link href={`/w/${slug}/documentos/${f.id}`} className="min-w-0 hover:underline">
                          <span className="font-mono text-xs text-muted-foreground">{f.numero}</span> {f.tipo_servicio}
                          <span className="block text-xs text-muted-foreground">{formatearFecha(f.fecha)}</span>
                        </Link>
                        <EtiquetaFicha estado={f.estado_final} />
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
