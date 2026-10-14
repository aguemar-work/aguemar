import type { Metadata } from "next";
import { DetalleCotizacion } from "./detalle";

export const metadata: Metadata = { title: "Cotización" };

export default async function CotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleCotizacion id={id} />;
}
