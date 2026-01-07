import { asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { banners } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const items = await db
    .select()
    .from(banners)
    .orderBy(asc(banners.sortOrder), desc(banners.id));

  return NextResponse.json({ ok: true, items });
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as {
    imageUrl?: unknown;
    linkUrl?: unknown;
    mainTitle?: unknown;
    subTitle?: unknown;
    sortOrder?: unknown;
    isActive?: unknown;
  };

  const imageUrl =
    typeof data?.imageUrl === "string" ? data.imageUrl.trim() : "";
  const linkUrl =
    typeof data?.linkUrl === "string" ? data.linkUrl.trim() : "";
  const mainTitle =
    typeof data?.mainTitle === "string" ? data.mainTitle.trim() : "";
  const subTitle =
    typeof data?.subTitle === "string" ? data.subTitle.trim() : "";
  const sortOrder =
    typeof data?.sortOrder === "number"
      ? data.sortOrder
      : Number(data?.sortOrder ?? 0) || 0;
  const isActive =
    typeof data?.isActive === "boolean"
      ? data.isActive
      : Boolean(data?.isActive ?? true);

  if (!imageUrl) {
    return NextResponse.json(
      { ok: false, error: "imageUrl is required" },
      { status: 400 },
    );
  }

  await db.insert(banners).values({
    imageUrl,
    linkUrl,
    mainTitle,
    subTitle,
    sortOrder,
    isActive: isActive ? 1 : 0,
  });

  return NextResponse.json({ ok: true });
}
