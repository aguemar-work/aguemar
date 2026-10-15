import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { Hilo } from "@/components/comentarios/hilo";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { obtenerActividad } from "@/lib/datos/calendario";
import { comentariosDe } from "@/lib/datos/comentarios";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { comentarPropietario } from "@/app/panel/bandeja/acciones";
import { infoTipo } from "@/lib/calendario";
import { eliminarActividad } from "../acciones";
import { FormularioActividad } from "../formulario-actividad";

export const metadata: Metadata = { title: "Actividad" };

/** Editar una actividad; si es de una empresa, debajo va el hilo de comentarios con ella. */
export default async function ActividadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [actividad, clientes, trabajos, comentarios, marca] = await Promise.all([
    obtenerActividad(id),
    opcionesClientes(),
    opcionesTrabajos(),
    comentariosDe("actividad", id),
    obtenerPerfilMarca(),
  ]);
  if (!actividad) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <PageHeader
          codigo="05"
          titulo={actividad.titulo}
          descripcion={`${infoTipo(actividad.tipo).etiqueta}${actividad.clientes ? ` · ${actividad.clientes.nombre}` : " · solo para ti"}`}
          acciones={
            <ConfirmarEliminar
              titulo="¿Eliminar esta actividad?"
              descripcion="Se quita del calendario (también del de la empresa) junto con sus comentarios."
              accion={eliminarActividad.bind(null, id)}
              irA="/panel/calendario"
              textoExito="Actividad eliminada."
            />
          }
        />
        <FormularioActividad actividad={actividad} clientes={clientes} trabajos={trabajos} />
      </div>
      {actividad.cliente_id ? (
        <Hilo
          comentarios={comentarios}
          vista="propietario"
          nombrePropietario={marca?.responsable ?? "Tú"}
          nombreEmpresa={actividad.clientes?.nombre ?? "Empresa"}
          enviar={comentarPropietario.bind(null, "actividad", id, actividad.cliente_id)}
          descripcion={actividad.visible_empresa ? "Lo que escribas aquí lo ve la empresa en su calendario." : "La actividad no es visible para la empresa: activa la visibilidad para que pueda leer y responder."}
        />
      ) : null}
    </div>
  );
}
