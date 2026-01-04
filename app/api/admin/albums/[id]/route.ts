import { asc, eq } from "drizzle-orm";
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

export async function GET(
  _request: Request,
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
    .select()
    .from(photoAlbums)
    .where(eq(photoAlbums.id, id))
    .limit(1);
  if (!album) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const photos = await db
    .select()
    .from(photoAlbumPhotos)
    .where(eq(photoAlbumPhotos.albumId, id))
    .orderBy(asc(photoAlbumPhotos.createdAt));

  return NextResponse.json({ ok: true, album, photos });
}

export async function DELETE(
  _request: Request,
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

  await db.delete(photoAlbums).where(eq(photoAlbums.id, id));

  return NextResponse.json({ ok: true });
}
