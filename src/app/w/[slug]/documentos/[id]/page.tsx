import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VistaFicha } from "@/components/documentos/vista-ficha";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";

export const metadata: Metadata = { title: "Ficha técnica" };

export default async function DocumentoWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [empresa, f] = await Promise.all([ws.miEmpresa(), ws.ficha(id)]);
  const desdeEquipos = moduloActivo(empresa?.modulos, "equipos");
  if ((!moduloActivo(empresa?.modulos, "documentos") && !desdeEquipos) || !f) notFound();
  const volver = moduloActivo(empresa?.modulos, "documentos") ? { href: `/w/${slug}/documentos`, texto: "Documentos" } : { href: `/w/${slug}/equipos`, texto: "Equipos" };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={volver.href} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {volver.texto}
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="mint">
            <a href={`/w/${slug}/fichas/${f.id}/pdf`} target="_blank" rel="noopener">
              <FileDown /> Ver PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/w/${slug}/fichas/${f.id}/pdf?descargar=1`}>Descargar</a>
          </Button>
        </div>
      </div>
      <VistaFicha f={f} />
    </>
  );
}
