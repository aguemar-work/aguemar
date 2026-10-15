import type { MetadataRoute } from "next";
import { envPublico } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${envPublico.NEXT_PUBLIC_SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
}
