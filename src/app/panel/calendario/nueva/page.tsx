import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { FormularioActividad } from "../formulario-actividad";

export const metadata: Metadata = { title: "Nueva actividad" };

export default async function NuevaActividadPage({ searchParams }: { searchParams: Promise<{ fecha?: string; cliente?: string; trabajo?: string }> }) {
  const inicial = await searchParams;
  const [clientes, trabajos] = await Promise.all([opcionesClientes(), opcionesTrabajos()]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="05" titulo="Nueva actividad" descripcion="Reunión, publicación, mantenimiento o trabajo planificado. Si es visible, la empresa la ve en su calendario y puede comentarla." />
      <FormularioActividad clientes={clientes} trabajos={trabajos} inicial={{ ...inicial, fecha: inicial.fecha && /^\d{4}-\d{2}-\d{2}$/.test(inicial.fecha) ? inicial.fecha : undefined }} />
    </div>
  );
}
