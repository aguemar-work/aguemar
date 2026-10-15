import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { AccionesDocumento } from "@/components/documentos/acciones-documento";
import { VistaInforme } from "@/components/documentos/vista-informe";
import { Hilo } from "@/components/comentarios/hilo";
import { Badge } from "@/components/ui/badge";
import { contextoInforme, obtenerInforme } from "@/lib/datos/informes";
import { comentariosDe } from "@/lib/datos/comentarios";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { comentarPropietario } from "@/app/panel/bandeja/acciones";
import { eliminarInforme, publicarInforme } from "../acciones";

export const metadata: Metadata = { title: "Informe" };

export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [i, ctx, comentarios, marca] = await Promise.all([obtenerInforme(id), contextoInforme(id), comentariosDe("informe", id), obtenerPerfilMarca()]);
  if (!i || !ctx.doc) notFound();
  const empresa = ctx.doc.clientes;
  const conWorkspace = Boolean(empresa?.usuario_id && empresa.slug && empresa.modulos?.includes("informes"));

  return (
    <>
      <PageHeader
        codigo="06"
        titulo={i.numero ?? "Informe"}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            {empresa ? (
              <Link href={`/panel/clientes/${empresa.id}`} className="underline-offset-4 hover:underline">
                {empresa.nombre}
              </Link>
            ) : null}
            {i.publicado ? <Badge variant="ok">Publicado</Badge> : <Badge variant="outline">Borrador</Badge>}
          </span>
        }
        acciones={
          <AccionesDocumento
            tipo="informe"
            id={i.id}
            numero={i.numero}
            titular={i.titulo}
            publicada={i.publicado}
            token={ctx.enlace && !ctx.enlace.revocado ? ctx.enlace.token : null}
            vistas={ctx.enlace?.vistas ?? 0}
            publicar={publicarInforme.bind(null, i.id)}
            ruta={`/panel/informes/${i.id}`}
            rutaWorkspace={`informes/${i.id}`}
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
        {i.publicado && ctx.enlace ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-muted-foreground">
            <Eye className="size-3.5" aria-hidden /> {ctx.enlace.vistas} {ctx.enlace.vistas === 1 ? "vista" : "vistas"} por enlace
          </span>
        ) : null}
        {i.publicado && empresa && !conWorkspace ? (
          <span className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">La empresa no tiene el módulo Informes: compártelo por enlace.</span>
        ) : null}
      </div>
      <VistaInforme i={i} />
      {ctx.doc.notas ? (
        <aside className="mt-8 rounded-lg border border-dashed border-border p-4 text-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Notas internas</p>
          <p className="whitespace-pre-line">{ctx.doc.notas}</p>
        </aside>
      ) : null}
      <div id="comentarios" className="mt-8 scroll-mt-20">
        <Hilo
          comentarios={comentarios}
          vista="propietario"
          nombrePropietario={marca?.responsable ?? "Tú"}
          nombreEmpresa={empresa?.nombre ?? "Empresa"}
          enviar={comentarPropietario.bind(null, "informe", i.id, ctx.doc.cliente_id)}
          descripcion={i.publicado ? "La empresa lee y responde estos comentarios desde su informe." : "Cuando publiques el informe, la empresa podrá leer y responder aquí."}
        />
      </div>
      <div className="mt-10 border-t border-border pt-4">
        <ConfirmarEliminar
          titulo={`¿Eliminar ${i.numero}?`}
          descripcion="Se elimina el informe con sus comentarios, y su enlace público deja de funcionar."
          accion={eliminarInforme.bind(null, i.id)}
          irA="/panel/informes"
          textoExito="Informe eliminado."
          variant="ghost"
          size="sm"
        >
          Eliminar informe
        </ConfirmarEliminar>
      </div>
    </>
  );
}
