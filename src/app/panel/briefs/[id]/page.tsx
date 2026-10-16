import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { AccionesDocumento } from "@/components/documentos/acciones-documento";
import { VistaBrief } from "@/components/documentos/vista-brief-acta";
import { Badge } from "@/components/ui/badge";
import { contextoDocumento, obtenerBrief } from "@/lib/datos/briefs-actas";
import { eliminarBrief, publicarBrief } from "@/app/panel/documentos/acciones";
import { EnlaceEmpresa } from "@/components/panel/enlace-empresa";
import { SoloPropietario } from "@/components/panel/solo-propietario";

export const metadata: Metadata = { title: "Brief" };

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [b, ctx] = await Promise.all([obtenerBrief(id), contextoDocumento("briefs", id)]);
  if (!b || !ctx.doc) notFound();
  const empresa = ctx.doc.clientes;
  const conWorkspace = Boolean(empresa?.usuario_id && empresa.slug && empresa.modulos?.includes("documentos"));

  return (
    <>
      <PageHeader
        codigo="06"
        titulo={b.numero ?? "Brief"}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            {empresa ? (
              <EnlaceEmpresa id={empresa.id} nombre={empresa.nombre} />
            ) : null}
            {b.publicado ? <Badge variant="ok">Publicado</Badge> : <Badge variant="outline">Borrador</Badge>}
          </span>
        }
        acciones={
          <AccionesDocumento
            tipo="brief"
            id={b.id}
            numero={b.numero}
            titular={b.titulo}
            publicada={b.publicado}
            token={ctx.enlace && !ctx.enlace.revocado ? ctx.enlace.token : null}
            vistas={ctx.enlace?.vistas ?? 0}
            publicar={publicarBrief.bind(null, b.id)}
            ruta={`/panel/briefs/${b.id}`}
            rutaWorkspace={`documentos/brief/${b.id}`}
            empresa={{ nombre: empresa?.nombre ?? "la empresa", contacto: empresa?.contacto ?? null, telefono: empresa?.telefono ?? null, slug: empresa?.slug ?? null, conWorkspace }}
          />
        }
      />
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {ctx.doc.trabajos ? (
          <Link href={`/panel/trabajos/${ctx.doc.trabajos.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:border-mint-ink/40">
            <KanbanSquare className="size-3.5" aria-hidden /> {ctx.doc.trabajos.titulo}
          </Link>
        ) : null}
        {b.publicado && ctx.enlace ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-muted-foreground">
            <Eye className="size-3.5" aria-hidden /> {ctx.enlace.vistas} {ctx.enlace.vistas === 1 ? "vista" : "vistas"}
          </span>
        ) : null}
      </div>
      <VistaBrief b={b} />
      {ctx.doc.notas ? (
        <aside className="mt-8 rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Notas internas</p>
          <p className="whitespace-pre-line">{ctx.doc.notas}</p>
        </aside>
      ) : null}
      <div className="mt-10 border-t border-border pt-4">
        <SoloPropietario>
          <ConfirmarEliminar
            titulo={`¿Eliminar ${b.numero}?`}
            descripcion="Se elimina el brief y su enlace público deja de funcionar."
            accion={eliminarBrief.bind(null, b.id)}
            irA="/panel/documentos"
            textoExito="Brief eliminado."
            variant="ghost"
            size="sm"
          >
            Eliminar brief
          </ConfirmarEliminar>
        </SoloPropietario>
        </div>
      </>
  );
}
