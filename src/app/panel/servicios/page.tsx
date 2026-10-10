import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Servicios" };

export default function ServiciosPage() {
  return (
    <>
      <PageHeader codigo="03" titulo="Servicios" descripcion="Catálogo que alimenta la landing y las cotizaciones." />
      <EmptyState
        icono={Wrench}
        titulo="Aún no hay servicios."
        descripcion="Agrega tu primer servicio con su precio base. Disponible en la Fase 2."
        accion={<Button variant="mint" disabled>Nuevo servicio</Button>}
      />
    </>
  );
}
