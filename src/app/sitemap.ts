import type { MetadataRoute } from "next";
import { envPublico } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = envPublico.NEXT_PUBLIC_SITE_URL;
  return [
    {
      url: `${base}/`,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: { "es-PE": `${base}/`, en: `${base}/en` } },
    },
    {
      url: `${base}/en`,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: { "es-PE": `${base}/`, en: `${base}/en` } },
    },
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
