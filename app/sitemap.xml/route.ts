import { desc } from "drizzle-orm";

import { DEFAULT_LOCALE, LOCALES } from "@/constants/i18n";
import { db } from "@/db";
import { photoAlbums, posts } from "@/db/schema";
import { getLocalizedPath, toAbsoluteUrl } from "@/lib/seo";
import type { Locale } from "@/types/i18n";

const staticPaths = ["/", "/posts", "/albums", "/about"] as const;

type UrlEntry = {
  pathname: string;
  lastModified?: Date;
};

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;");
}

function buildAlternates(pathname: string) {
  const links = LOCALES.map((locale) => {
    const href = toAbsoluteUrl(getLocalizedPath(locale, pathname));
    return `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(href)}" />`;
  });

  const defaultHref = toAbsoluteUrl(
    getLocalizedPath(DEFAULT_LOCALE as Locale, pathname),
  );
  links.push(
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(defaultHref)}" />`,
  );

  return links.join("");
}

function buildUrlNode({ pathname, lastModified }: UrlEntry) {
  const canonicalUrl = toAbsoluteUrl(
    getLocalizedPath(DEFAULT_LOCALE as Locale, pathname),
  );
  const lastmodNode = lastModified
    ? `<lastmod>${lastModified.toISOString()}</lastmod>`
    : "";
  const alternates = buildAlternates(pathname);

  return `<url><loc>${escapeXml(canonicalUrl)}</loc>${lastmodNode}${alternates}</url>`;
}

export async function GET() {
  const [postItems, albumItems] = await Promise.all([
    db
      .select({
        id: posts.id,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .orderBy(desc(posts.updatedAt)),
    db
      .select({
        id: photoAlbums.id,
        createdAt: photoAlbums.createdAt,
        updatedAt: photoAlbums.updatedAt,
      })
      .from(photoAlbums)
      .orderBy(desc(photoAlbums.updatedAt)),
  ]);

  const entries: UrlEntry[] = [];

  for (const pathname of staticPaths) {
    entries.push({ pathname });
  }

  for (const item of postItems) {
    entries.push({
      pathname: `/posts/${item.id}`,
      lastModified: item.updatedAt ?? item.createdAt ?? undefined,
    });
  }

  for (const item of albumItems) {
    entries.push({
      pathname: `/albums/${item.id}`,
      lastModified: item.updatedAt ?? item.createdAt ?? undefined,
    });
  }

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...entries.map(buildUrlNode),
    `</urlset>`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
