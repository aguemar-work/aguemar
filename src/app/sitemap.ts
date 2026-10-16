import type { MetadataRoute } from "next";
import { envPublico } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = envPublico.NEXT_PUBLIC_SITE_URL;
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
