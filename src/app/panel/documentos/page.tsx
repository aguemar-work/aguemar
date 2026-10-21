import type { Metadata } from "next";
import Link from "@/components/panel/enlace";
import { ClipboardList, Download, FileSignature, FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Buscador } from "@/components/panel/buscador";
import { EtiquetaFicha } from "@/components/panel/etiquetas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarDocumentos, type DocumentoListado } from "@/lib/datos/briefs-actas";
import { NOMBRE_DOCUMENTO } from "@/lib/documentos";
import { formatearFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EstadoFinalFicha } from "@/types/database";

export const metadata: Metadata = { title: "Documentos" };

const PESTANAS = [
  { valor: "", etiqueta: "Todos" },
  { valor: "ficha", etiqueta: "Fichas técnicas" },
  { valor: "brief", etiqueta: "Briefs" },
  { valor: "acta", etiqueta: "Actas de entrega" },
];

const RUTA: Record<DocumentoListado["tipo"], string> = { ficha: "/panel/fichas", brief: "/panel/briefs", acta: "/panel/actas" };

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<{ tipo?: string; q?: string }> }) {
  const { tipo = "", q } = await searchParams;
  const docs = await listarDocumentos({ tipo: tipo || undefined, q });

  return (
    <>
      <PageHeader
        codigo="06"
        titulo="Documentos"
        descripcion="Fichas técnicas de soporte, briefs antes de empezar y actas al entregar. Al publicarlos, la empresa los ve y tienen enlace para compartir."
        acciones={
          <>
            <Button asChild variant="outline">
              <a href="/diagnostico-agueMar.ps1" download>
                <Download /> Script de diagnóstico
              </a>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="mint">
                  <Plus /> Nuevo documento
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/panel/fichas/nueva">
                    <ClipboardList /> Ficha técnica
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/panel/briefs/nuevo">
                    <FileText /> Brief
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/panel/actas/nueva">
                    <FileSignature /> Acta de entrega
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <nav aria-label="Tipo de documento" className="mb-3 flex flex-wrap gap-1.5">
        {PESTANAS.map((p) => (
          <Link
            key={p.valor}
            href={p.valor ? `/panel/documentos?tipo=${p.valor}` : "/panel/documentos"}
            aria-current={tipo === p.valor ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              tipo === p.valor ? "border-transparent bg-ink text-white dark:bg-mint dark:text-ink" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {p.etiqueta}
          </Link>
        ))}
      </nav>
      <div className="mb-4">
        <Buscador placeholder="Buscar por número o título" valorInicial={q} />
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icono={ClipboardList}
          titulo={q ? `Sin resultados para "${q}".` : "Aún no hay documentos."}
          descripcion="Crea una ficha técnica después de un servicio, un brief antes de empezar un proyecto o un acta al entregarlo."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.map((d) => (
              <TableRow key={`${d.tipo}-${d.id}`}>
                <TableCell className="font-mono text-xs">
                  <Link href={`${RUTA[d.tipo]}/${d.id}`} className="underline-offset-4 hover:underline">
                    {d.numero}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`${RUTA[d.tipo]}/${d.id}`} className="block font-medium underline-offset-4 hover:underline">
                    {d.titulo}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {NOMBRE_DOCUMENTO[d.tipo]} · {d.empresa ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="hidden font-mono text-xs md:table-cell">{formatearFecha(d.fecha)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {d.tipo === "ficha" && d.estado ? <EtiquetaFicha estado={d.estado as EstadoFinalFicha} /> : null}
                    {d.tipo === "acta" && d.estado === "aceptada" ? <Badge variant="ok">Aceptada</Badge> : null}
                    {d.tipo === "acta" && d.estado === "por_aceptar" ? <Badge variant="warn">Por aceptar</Badge> : null}
                    {!d.publicado ? <Badge variant="outline">Borrador</Badge> : d.tipo !== "acta" ? <Badge variant="ok">Publicado</Badge> : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
