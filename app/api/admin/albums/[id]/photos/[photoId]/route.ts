import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { photoAlbumPhotos } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; photoId: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { id: rawAlbumId, photoId: rawPhotoId } = await context.params;
  const albumId = parseId(rawAlbumId);
  const photoId = parseId(rawPhotoId);
  if (!albumId || !photoId) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  await db
    .delete(photoAlbumPhotos)
    .where(
      and(
        eq(photoAlbumPhotos.id, photoId),
        eq(photoAlbumPhotos.albumId, albumId),
      ),
    );

  return NextResponse.json({ ok: true });
}
