import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Cotizaciones" };

export default function CotizacionesPage() {
  return (
    <>
      <PageHeader codigo="04" titulo="Cotizaciones" descripcion="Numeración automática COT-AAAA-NNN y vista previa del PDF." />
      <EmptyState
        icono={FileText}
        titulo="Aún no hay cotizaciones."
        descripcion="Crea la primera y compártela por WhatsApp o correo. Disponible en la Fase 3."
        accion={<Button variant="mint" disabled>Nueva cotización</Button>}
      />
    </>
  );
}
