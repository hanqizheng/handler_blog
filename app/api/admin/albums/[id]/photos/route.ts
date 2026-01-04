import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { photoAlbumPhotos, photoAlbums } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const [album] = await db
    .select({ id: photoAlbums.id })
    .from(photoAlbums)
    .where(eq(photoAlbums.id, id))
    .limit(1);
  if (!album) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as { imageUrl?: unknown; imageKey?: unknown };
  const imageUrl =
    typeof data?.imageUrl === "string" ? data.imageUrl.trim() : "";
  const imageKey =
    typeof data?.imageKey === "string" ? data.imageKey.trim() : "";

  if (!imageUrl) {
    return NextResponse.json(
      { ok: false, error: "imageUrl is required" },
      { status: 400 },
    );
  }

  await db.insert(photoAlbumPhotos).values({ albumId: id, imageUrl, imageKey });

  return NextResponse.json({ ok: true });
}
