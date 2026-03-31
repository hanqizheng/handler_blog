import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { DEFAULT_LOCALE } from "@/constants/i18n";
import { db } from "@/db";
import { photoAlbums, posts } from "@/db/schema";
import { getLocalizedPath, toAbsoluteUrl } from "@/lib/seo";
import type { Locale } from "@/types/i18n";

export const runtime = "nodejs";

function verifyApiKey(request: Request): boolean {
  const secret = process.env.BAIDU_PUSH_SECRET?.trim();
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  return authHeader === `Bearer ${secret}`;
}

async function getAllUrls(): Promise<string[]> {
  const staticPaths = ["/", "/posts", "/albums", "/about"];

  const [postItems, albumItems] = await Promise.all([
    db.select({ id: posts.id }).from(posts).orderBy(desc(posts.createdAt)),
    db
      .select({ id: photoAlbums.id })
      .from(photoAlbums)
      .orderBy(desc(photoAlbums.createdAt)),
  ]);

  const paths = [
    ...staticPaths,
    ...postItems.map((p) => `/posts/${p.id}`),
    ...albumItems.map((a) => `/albums/${a.id}`),
  ];

  return paths.map((p) =>
    toAbsoluteUrl(getLocalizedPath(DEFAULT_LOCALE as Locale, p)),
  );
}

export async function POST(request: Request) {
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const site = process.env.BAIDU_PUSH_SITE?.trim();
  const token = process.env.BAIDU_PUSH_TOKEN?.trim();

  if (!site || !token) {
    return NextResponse.json(
      {
        ok: false,
        error: "BAIDU_PUSH_SITE or BAIDU_PUSH_TOKEN not configured",
      },
      { status: 500 },
    );
  }

  const urls = await getAllUrls();

  const baiduUrl = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${encodeURIComponent(token)}`;

  const response = await fetch(baiduUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: urls.join("\n"),
  });

  const result = await response.json();

  return NextResponse.json({
    ok: response.ok,
    status: response.status,
    urlCount: urls.length,
    data: result,
  });
}
