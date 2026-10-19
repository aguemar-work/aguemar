import type { Metadata } from "next";
import { PaginaLanding } from "@/components/landing/pagina-landing";
import { metadataLanding } from "@/lib/landing-meta";

// Estática y regenerada cada hora; además, guardar servicios o Mi marca la regenera al instante.
export const revalidate = 3600;

export const metadata: Metadata = metadataLanding("es");

export default function Inicio() {
  return <PaginaLanding idioma="es" />;
}
