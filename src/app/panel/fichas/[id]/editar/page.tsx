import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { listarPlantillas } from "@/lib/datos/marca";
import { obtenerFichaEdicion, opcionesEquipos, opcionesTrabajos } from "@/lib/datos/fichas";
import { FormularioFicha } from "../../formulario-ficha";

export const metadata: Metadata = { title: "Editar ficha técnica" };

export default async function EditarFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ficha, clientes, equipos, trabajos, plantillas] = await Promise.all([obtenerFichaEdicion(id), opcionesClientes(), opcionesEquipos(), opcionesTrabajos(), listarPlantillas()]);
  if (!ficha) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo={`Editar ${ficha.numero}`} descripcion={ficha.publicada ? "Está publicada: la empresa verá los cambios al guardar." : undefined} />
      <FormularioFicha ficha={ficha} clientes={clientes} equipos={equipos} trabajos={trabajos} plantillas={plantillas} />
    </div>
  );
}
