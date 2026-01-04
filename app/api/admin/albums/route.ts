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
  const asciiSlug = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (asciiSlug) return asciiSlug;
  return encodeURIComponent(trimmed).replace(/%2F/gi, "-");
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

  const data = payload as { name?: unknown; description?: unknown };
  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const description =
    typeof data?.description === "string" ? data.description.trim() : "";

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "name is required" },
      { status: 400 },
    );
  }

  const slugBase = slugify(name) || `${Date.now()}`;
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  await db.insert(photoAlbums).values({ name, description, slug });

  return NextResponse.json({ ok: true });
}
