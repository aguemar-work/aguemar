import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { datosTrabajo } from "@/lib/datos/briefs-actas";
import { FormularioInforme } from "../formulario-informe";

export const metadata: Metadata = { title: "Nuevo informe" };

export default async function NuevoInformePage({ searchParams }: { searchParams: Promise<{ cliente?: string; trabajo?: string }> }) {
  const { cliente, trabajo } = await searchParams;
  const [clientes, trabajos, t] = await Promise.all([opcionesClientes(), opcionesTrabajos(), trabajo ? datosTrabajo(trabajo) : null]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo="Nuevo informe" descripcion="Elige la empresa y el periodo, y arma el informe con lo que registraste. Queda en borrador hasta que lo publiques." />
      <FormularioInforme clientes={clientes} trabajos={trabajos} inicial={{ cliente: t?.cliente_id ?? cliente, trabajo: t?.id, area: t?.area }} />
    </div>
  );
}
