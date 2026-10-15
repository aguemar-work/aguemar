import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VistaBrief } from "@/components/documentos/vista-brief-acta";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";

export const metadata: Metadata = { title: "Brief" };

export default async function BriefWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [empresa, b] = await Promise.all([ws.miEmpresa(), ws.brief(id)]);
  if (!moduloActivo(empresa?.modulos, "documentos") || !b) notFound();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`/w/${slug}/documentos`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Documentos
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="mint">
            <a href={`/w/${slug}/briefs/${b.id}/pdf`} target="_blank" rel="noopener">
              <FileDown /> Ver PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/w/${slug}/briefs/${b.id}/pdf?descargar=1`}>Descargar</a>
          </Button>
        </div>
      </div>
      <VistaBrief b={b} />
    </>
  );
}
