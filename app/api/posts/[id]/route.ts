import { eq } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";

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
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const [item] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!item) {
    return Response.json({ ok: false, error: "not found" }, { status: 404 });
  }

  return Response.json({ ok: true, item });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as {
    title?: unknown;
    content?: unknown;
    assetFolder?: unknown;
  };
  const title = typeof data?.title === "string" ? data.title.trim() : "";
  const content = typeof data?.content === "string" ? data.content.trim() : "";
  const assetFolder =
    typeof data?.assetFolder === "string" ? data.assetFolder.trim() : "";

  if (!title || !content) {
    return Response.json(
      { ok: false, error: "title and content are required" },
      { status: 400 },
    );
  }

  await db
    .update(posts)
    .set({
      title,
      content,
      ...(assetFolder ? { assetFolder } : {}),
    })
    .where(eq(posts.id, id));

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  await db.delete(posts).where(eq(posts.id, id));

  return Response.json({ ok: true });
}
