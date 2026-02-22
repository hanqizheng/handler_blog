import type { MetadataRoute } from "next";

import { LOCALES } from "@/constants/i18n";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const localeDisallowRules = LOCALES.flatMap((locale) => [
    `/${locale}/admin`,
    `/${locale}/admin/*`,
    `/${locale}/api/admin`,
    `/${locale}/api/admin/*`,
  ]);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/admin",
          "/api/admin/*",
          ...localeDisallowRules,
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
