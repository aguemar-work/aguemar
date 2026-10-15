import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Buscador } from "@/components/panel/buscador";
import { EtiquetaFicha } from "@/components/panel/etiquetas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarFichas } from "@/lib/datos/fichas";
import { nombreEquipo } from "@/lib/documentos";
import { formatearFecha } from "@/lib/format";

export const metadata: Metadata = { title: "Fichas técnicas" };

export default async function FichasPage({ searchParams }: { searchParams: Promise<{ q?: string; cliente?: string }> }) {
  const { q, cliente } = await searchParams;
  const fichas = await listarFichas({ q, cliente });

  return (
    <>
      <PageHeader
        codigo="06"
        titulo="Fichas técnicas"
        descripcion="El registro de cada servicio de soporte: diagnóstico, trabajos, incidencias y recomendaciones, con PDF y QR."
        acciones={
          <>
            <Button asChild variant="outline">
              <a href="/diagnostico-agueMar.ps1" download>
                <Download /> Script de diagnóstico
              </a>
            </Button>
            <Button asChild variant="mint">
              <Link href="/panel/fichas/nueva">
                <Plus /> Nueva ficha
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Buscador placeholder="Buscar por número, titular o servicio" valorInicial={q} />
      </div>

      {fichas.length === 0 ? (
        <EmptyState
          icono={ClipboardList}
          titulo={q ? `Sin resultados para "${q}".` : "Aún no hay fichas técnicas."}
          descripcion="Ejecuta el script en la PC del cliente, crea la ficha e importa el diagnóstico: el equipo y el estado inicial se llenan solos."
          accion={
            <Button asChild variant="mint">
              <Link href="/panel/fichas/nueva">
                <Plus /> Nueva ficha
              </Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Publicación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fichas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/panel/fichas/${f.id}`} className="underline-offset-4 hover:underline">
                    {f.numero}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/panel/fichas/${f.id}`} className="block font-medium underline-offset-4 hover:underline">
                    {f.titular || f.tipo_servicio}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {f.clientes?.nombre ?? "—"} · {nombreEquipo(f.equipos)}
                  </span>
                </TableCell>
                <TableCell className="hidden font-mono text-xs md:table-cell">{formatearFecha(f.fecha)}</TableCell>
                <TableCell>
                  <EtiquetaFicha estado={f.estado_final} />
                </TableCell>
                <TableCell className="hidden sm:table-cell">{f.publicada ? <Badge variant="ok">Publicada</Badge> : <Badge variant="outline">Borrador</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
