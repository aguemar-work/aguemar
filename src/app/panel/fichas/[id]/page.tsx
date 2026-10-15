import type { Metadata } from "next";
import { DetalleFicha } from "./detalle";

export const metadata: Metadata = { title: "Ficha técnica" };

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalleFicha id={id} />;
}
