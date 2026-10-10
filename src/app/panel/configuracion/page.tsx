import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Mi marca" };

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader codigo="07" titulo="Mi marca" descripcion="Datos que aparecen en tus documentos: responsable, RUC, contacto, IGV y pagos." />
      <EmptyState
        icono={Settings}
        titulo="Configura tu marca."
        descripcion="Define responsable, RUC, contacto, IGV, moneda y datos de pago. Disponible en la Fase 2."
        accion={<Button variant="mint" disabled>Editar marca</Button>}
      />
    </>
  );
}
