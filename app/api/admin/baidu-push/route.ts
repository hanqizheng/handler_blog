import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
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

  const body = await request.json();
  const urls: string[] = body.urls;

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { ok: false, error: "urls must be a non-empty array of strings" },
      { status: 400 },
    );
  }

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
    data: result,
  });
}
