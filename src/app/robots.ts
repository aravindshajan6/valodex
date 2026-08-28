import type { MetadataRoute } from "next";

import { SITE } from "@/config/site";

const BASE = SITE.url;

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${BASE}/sitemap.xml` };
}
