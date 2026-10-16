import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, KanbanSquare, Laptop } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { VistaFicha } from "@/components/documentos/vista-ficha";
import { Badge } from "@/components/ui/badge";
import { contextoFicha, obtenerFicha } from "@/lib/datos/fichas";
import { nombreEquipo } from "@/lib/documentos";
import { formatearFechaHora } from "@/lib/format";
import { eliminarFicha, publicarFicha } from "../acciones";
import { AccionesDocumento } from "@/components/documentos/acciones-documento";
import { EnlaceEmpresa } from "@/components/panel/enlace-empresa";
import { SoloPropietario } from "@/components/panel/solo-propietario";

/** Detalle de una ficha. Se usa en la página completa y en el panel lateral (@modal). */
export async function DetalleFicha({ id }: { id: string }) {
  const [f, ctx] = await Promise.all([obtenerFicha(id), contextoFicha(id)]);
  if (!f || !ctx.ficha) notFound();
  const empresa = ctx.ficha.clientes;
  const conWorkspace = Boolean(empresa?.usuario_id && empresa.slug && empresa.modulos?.includes("documentos"));
  const token = ctx.enlace && !ctx.enlace.revocado ? ctx.enlace.token : null;

  return (
    <>
      <PageHeader
        codigo="06"
        titulo={f.numero ?? "Ficha técnica"}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            {empresa ? (
              <EnlaceEmpresa id={empresa.id} nombre={empresa.nombre} />
            ) : null}
            {f.publicada ? <Badge variant="ok">Publicada</Badge> : <Badge variant="outline">Borrador</Badge>}
          </span>
        }
        acciones={
          <AccionesDocumento
            tipo="ficha"
            publicar={publicarFicha.bind(null, f.id)}
            ruta={`/panel/fichas/${f.id}`}
            rutaWorkspace={`documentos/${f.id}`}
            id={f.id}
            numero={f.numero}
            titular={f.titular}
            publicada={f.publicada}
            token={token}
            vistas={ctx.enlace?.vistas ?? 0}
            empresa={{ nombre: empresa?.nombre ?? "la empresa", contacto: empresa?.contacto ?? null, telefono: empresa?.telefono ?? null, slug: empresa?.slug ?? null, conWorkspace }}
          />
        }
      />

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {ctx.ficha.equipo_id ? (
          <Link href={`/panel/equipos/${ctx.ficha.equipo_id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:border-mint-ink/40">
            <Laptop className="size-3.5" aria-hidden /> {nombreEquipo(f.equipo)}
          </Link>
        ) : null}
        {ctx.ficha.trabajos ? (
          <Link href={`/panel/trabajos/${ctx.ficha.trabajos.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 hover:border-mint-ink/40">
            <KanbanSquare className="size-3.5" aria-hidden /> {ctx.ficha.trabajos.titulo}
          </Link>
        ) : null}
        {f.publicada && ctx.enlace ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-muted-foreground">
            <Eye className="size-3.5" aria-hidden /> {ctx.enlace.vistas} {ctx.enlace.vistas === 1 ? "vista" : "vistas"}
            {ctx.enlace.ultima_vista ? ` · última ${formatearFechaHora(ctx.enlace.ultima_vista)}` : ""}
          </span>
        ) : null}
        {!f.publicada ? (
          <span className="text-muted-foreground">
            {conWorkspace ? "Al publicarla, la empresa la verá en Documentos y se activará el enlace con QR." : "Al publicarla se activa el enlace con QR para compartirla."}
          </span>
        ) : null}
      </div>

      <VistaFicha f={f} />

      <div className="mt-10 border-t border-border pt-4">
        <SoloPropietario>
          <ConfirmarEliminar
            titulo={`¿Eliminar ${f.numero}?`}
            descripcion="Se elimina la ficha con su diagnóstico, trabajos e incidencias, y su enlace público deja de funcionar. El equipo se conserva."
            accion={eliminarFicha.bind(null, f.id)}
            irA="/panel/documentos"
            textoExito="Ficha eliminada."
            variant="ghost"
            size="sm"
          >
            Eliminar ficha
          </ConfirmarEliminar>
        </SoloPropietario>
        </div>
      </>
  );
}
