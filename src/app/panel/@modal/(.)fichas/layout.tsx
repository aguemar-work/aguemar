import { PanelLateral } from "@/components/panel/panel-lateral";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PanelLateral etiqueta="Ficha técnica" ancho="xl">
      {children}
    </PanelLateral>
  );
}
