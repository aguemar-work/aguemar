import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { AccionesDocumento } from "@/components/documentos/acciones-documento";
import { VistaActa } from "@/components/documentos/vista-brief-acta";
import { Badge } from "@/components/ui/badge";
import { contextoDocumento, obtenerActa } from "@/lib/datos/briefs-actas";
import { eliminarActa, publicarActa } from "@/app/panel/documentos/acciones";
import { RegistrarConformidad } from "./conformidad";

export const metadata: Metadata = { title: "Acta de entrega" };

export default async function ActaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, ctx] = await Promise.all([obtenerActa(id), contextoDocumento("actas_entrega", id)]);
  if (!a || !ctx.doc) notFound();
  const empresa = ctx.doc.clientes;
  const conWorkspace = Boolean(empresa?.usuario_id && empresa.slug && empresa.modulos?.includes("documentos"));

  return (
    <>
      <PageHeader
        codigo="06"
        titulo={a.numero ?? "Acta de entrega"}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            {empresa ? (
              <Link href={`/panel/clientes/${empresa.id}`} className="underline-offset-4 hover:underline">
                {empresa.nombre}
              </Link>
            ) : null}
            {a.aceptacion ? <Badge variant="ok">Aceptada</Badge> : a.publicada ? <Badge variant="warn">Por aceptar</Badge> : <Badge variant="outline">Borrador</Badge>}
          </span>
        }
        acciones={
          <AccionesDocumento
            tipo="acta"
            id={a.id}
            numero={a.numero}
            titular={a.titulo}
            publicada={a.publicada}
            token={ctx.enlace && !ctx.enlace.revocado ? ctx.enlace.token : null}
            vistas={ctx.enlace?.vistas ?? 0}
            publicar={publicarActa.bind(null, a.id)}
            ruta={`/panel/actas/${a.id}`}
            rutaWorkspace={`documentos/acta/${a.id}`}
            bloqueado={Boolean(a.aceptacion)}
            extra={a.aceptacion ? null : <RegistrarConformidad id={a.id} contacto={empresa?.contacto ?? null} />}
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
        {a.publicada && ctx.enlace ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-muted-foreground">
            <Eye className="size-3.5" aria-hidden /> {ctx.enlace.vistas} {ctx.enlace.vistas === 1 ? "vista" : "vistas"}
          </span>
        ) : null}
        {!a.publicada ? (
          <span className="text-muted-foreground">
            {conWorkspace ? "Al publicarla, la empresa la verá en Documentos y podrá aceptarla." : "Al publicarla se activa el enlace para que la acepten sin iniciar sesión."}
          </span>
        ) : null}
      </div>
      <VistaActa a={a} />
      {ctx.doc.notas ? (
        <aside className="mt-8 rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Notas internas</p>
          <p className="whitespace-pre-line">{ctx.doc.notas}</p>
        </aside>
      ) : null}
      {!a.aceptacion ? (
        <div className="mt-10 border-t border-border pt-4">
          <ConfirmarEliminar
            titulo={`¿Eliminar ${a.numero}?`}
            descripcion="Se elimina el acta y su enlace público deja de funcionar."
            accion={eliminarActa.bind(null, a.id)}
            irA="/panel/documentos"
            textoExito="Acta eliminada."
            variant="ghost"
            size="sm"
          >
            Eliminar acta
          </ConfirmarEliminar>
        </div>
      ) : null}
    </>
  );
}
