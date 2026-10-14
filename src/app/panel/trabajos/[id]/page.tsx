import type { Metadata } from "next";
import { DetalleTrabajo } from "./detalle";

export const metadata: Metadata = { title: "Trabajo" };

export default async function TrabajoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleTrabajo id={id} />;
}
