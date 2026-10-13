import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { listarPlantillas, obtenerPerfilMarca } from "@/lib/datos/marca";
import { FormularioMarca } from "./formulario-marca";
import { EditorPlantillas } from "./editor-plantillas";

export const metadata: Metadata = { title: "Mi marca" };

export default async function ConfiguracionPage() {
  const [perfil, plantillas] = await Promise.all([obtenerPerfilMarca(), listarPlantillas()]);

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <PageHeader codigo="07" titulo="Mi marca" descripcion="Datos que aparecen en tus documentos: responsable, RUC, contacto, IGV y pagos." />
        <FormularioMarca perfil={perfil} />
      </div>
      <EditorPlantillas plantillas={plantillas} />
    </div>
  );
}
