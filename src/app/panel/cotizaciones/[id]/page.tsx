import type { Metadata } from "next";
import { DetalleCotizacion } from "./detalle";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Cotización" };

export default async function CotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const { id } = await params;
  return <DetalleCotizacion id={id} />;
}
