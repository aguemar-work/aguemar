import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { datosTrabajo, entregablesDeTrabajo } from "@/lib/datos/briefs-actas";
import { FormularioActa } from "@/app/panel/documentos/formulario-acta";

export const metadata: Metadata = { title: "Nueva acta de entrega" };

export default async function NuevaActaPage({ searchParams }: { searchParams: Promise<{ cliente?: string; trabajo?: string }> }) {
  const { cliente, trabajo } = await searchParams;
  const [clientes, trabajos, t, entregables] = await Promise.all([
    opcionesClientes(),
    opcionesTrabajos(),
    trabajo ? datosTrabajo(trabajo) : null,
    trabajo ? entregablesDeTrabajo(trabajo) : [],
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo="Nueva acta de entrega" descripcion="Deja constancia de lo que entregas. Al publicarla, la empresa la acepta con su nombre y DNI y el trabajo pasa a entregado." />
      <FormularioActa clientes={clientes} trabajos={trabajos} inicial={{ cliente: t?.cliente_id ?? cliente, trabajo: t?.id, area: t?.area, titulo: t?.titulo, entregables }} />
    </div>
  );
}
