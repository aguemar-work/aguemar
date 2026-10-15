import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { datosTrabajo } from "@/lib/datos/briefs-actas";
import { FormularioBrief } from "@/app/panel/documentos/formulario-brief";

export const metadata: Metadata = { title: "Nuevo brief" };

export default async function NuevoBriefPage({ searchParams }: { searchParams: Promise<{ cliente?: string; trabajo?: string }> }) {
  const { cliente, trabajo } = await searchParams;
  const [clientes, trabajos, t] = await Promise.all([opcionesClientes(), opcionesTrabajos(), trabajo ? datosTrabajo(trabajo) : null]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo="Nuevo brief" descripcion="Lo que se acordó antes de empezar: objetivo, público, alcance y entregables. La empresa lo ve cuando lo publicas." />
      <FormularioBrief
        clientes={clientes}
        trabajos={trabajos}
        inicial={{ cliente: t?.cliente_id ?? cliente, trabajo: t?.id, area: t?.area, titulo: t?.titulo, objetivo: t?.descripcion }}
      />
    </div>
  );
}
