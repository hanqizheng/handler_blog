import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { photoAlbums } from "@/db/schema";
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
    .from(photoAlbums)
    .orderBy(desc(photoAlbums.createdAt), desc(photoAlbums.id));

  return NextResponse.json({ ok: true, items });
}

const slugify = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const normalized = trimmed.normalize("NFKD").replace(/[^\x00-\x7f]/g, "");
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

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
    name?: unknown;
    description?: unknown;
    coverUrl?: unknown;
  };
  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const description =
    typeof data?.description === "string" ? data.description.trim() : "";
  const coverUrl =
    typeof data?.coverUrl === "string" ? data.coverUrl.trim() : "";

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 },
    );
  }

  const slugBase = slugify(name) || "album";
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  await db.insert(photoAlbums).values({
    name,
    description,
    slug,
    coverUrl: coverUrl || null,
  });

  return NextResponse.json({ ok: true });
}
