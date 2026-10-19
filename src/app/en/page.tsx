import type { Metadata } from "next";
import { PaginaLanding } from "@/components/landing/pagina-landing";
import { metadataLanding } from "@/lib/landing-meta";

// Misma landing que `/`, en inglés. Se regenera igual que la versión en español.
export const revalidate = 3600;

export const metadata: Metadata = metadataLanding("en");

export default function Home() {
  return <PaginaLanding idioma="en" />;
}
