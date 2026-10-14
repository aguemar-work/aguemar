import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Fichas técnicas" };

export default function FichasPage() {
  return (
    <>
      <PageHeader codigo="05" titulo="Fichas técnicas" descripcion="El registro de cada servicio, con numeración FT-AAAA-NNN." />
      <EmptyState
        icono={ClipboardList}
        titulo="Aún no hay fichas técnicas."
        descripcion="Registra un servicio y entrega la ficha a tu cliente. Llega en la fase 7, con el diagnóstico importado desde diagnostico-agueMar.ps1."
        accion={<Button variant="mint" disabled>Nueva ficha</Button>}
      />
    </>
  );
}
