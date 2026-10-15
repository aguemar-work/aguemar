import type { Metadata } from "next";
import Link from "next/link";
import { FileBarChart, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Buscador } from "@/components/panel/buscador";
import { SelectorParam } from "@/components/panel/selector-param";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarInformes } from "@/lib/datos/informes";
import { opcionesClientes } from "@/lib/datos/clientes";
import { textoPeriodo } from "@/lib/informe";

export const metadata: Metadata = { title: "Informes" };

export default async function InformesPage({ searchParams }: { searchParams: Promise<{ q?: string; empresa?: string; estado?: string }> }) {
  const { q, empresa, estado } = await searchParams;
  const [informes, clientes] = await Promise.all([listarInformes({ q, cliente: empresa, estado }), opcionesClientes()]);
  const filtrado = Boolean(q || empresa || estado);

  return (
    <>
      <PageHeader
        codigo="06"
        titulo="Informes"
        descripcion="Informes de avance por empresa y periodo. Se arman con lo que registraste (tareas, actividades, fichas) y la empresa los ve al publicarlos."
        acciones={
          <Button asChild variant="mint">
            <Link href={empresa ? `/panel/informes/nuevo?cliente=${empresa}` : "/panel/informes/nuevo"}>
              <Plus /> Nuevo informe
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Buscador placeholder="Buscar por número o título" valorInicial={q} />
        </div>
        <SelectorParam param="empresa" etiqueta="Empresa" todos="Todas las empresas" opciones={clientes.map((c) => ({ valor: c.id, etiqueta: c.nombre }))} className="sm:w-56" />
        <SelectorParam
          param="estado"
          etiqueta="Estado"
          todos="Todos"
          opciones={[
            { valor: "borrador", etiqueta: "Borradores" },
            { valor: "publicado", etiqueta: "Publicados" },
          ]}
          className="sm:w-40"
        />
      </div>

      {informes.length === 0 ? (
        <EmptyState
          icono={FileBarChart}
          titulo={filtrado ? "Sin informes con esos filtros." : "Aún no hay informes."}
          descripcion="Al cerrar el mes, crea el informe de cada empresa: elige el periodo y pulsa “Armar con lo del periodo”."
          accion={
            filtrado ? undefined : (
              <Button asChild variant="mint">
                <Link href="/panel/informes/nuevo">
                  <Plus /> Nuevo informe
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Informe</TableHead>
              <TableHead className="hidden md:table-cell">Periodo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {informes.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/panel/informes/${i.id}`} className="underline-offset-4 hover:underline">
                    {i.numero}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/panel/informes/${i.id}`} className="block font-medium underline-offset-4 hover:underline">
                    {i.titulo}
                  </Link>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    {i.empresa ?? "—"} <EtiquetaArea area={i.area} />
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">{textoPeriodo(i.periodo_inicio, i.periodo_fin)}</TableCell>
                <TableCell>{i.publicado ? <Badge variant="ok">Publicado</Badge> : <Badge variant="outline">Borrador</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
