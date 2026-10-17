import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { PestanasAjustes } from "@/components/panel/pestanas-ajustes";
import { listarPlantillas } from "@/lib/datos/marca";
import { soloPropietario } from "@/lib/datos/base";
import { EditorPlantillas } from "./editor-plantillas";

export const metadata: Metadata = { title: "Plantillas" };

export default async function PlantillasPage() {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const plantillas = await listarPlantillas();

  return (
    <div className="mx-auto max-w-4xl">
      <PestanasAjustes actual="/panel/plantillas" />
      <PageHeader
        titulo="Plantillas de checklist"
        descripcion="Los trabajos realizados de cada ficha se precargan según el tipo de servicio. Puedes editarlos en cada ficha."
      />
      <EditorPlantillas plantillas={plantillas} />
    </div>
  );
}
