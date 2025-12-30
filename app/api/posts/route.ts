import { desc } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";

export const runtime = "nodejs";

export async function GET() {
  const items = await db.select().from(posts).orderBy(desc(posts.id));
  return Response.json({ ok: true, items });
}

export async function POST(request: Request) {
  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as { title?: unknown; content?: unknown };
  const title = typeof data?.title === "string" ? data.title.trim() : "";
  const content = typeof data?.content === "string" ? data.content.trim() : "";

  if (!title || !content) {
    return Response.json(
      { ok: false, error: "title and content are required" },
      { status: 400 },
    );
  }

  await db.insert(posts).values({ title, content });

  return Response.json({ ok: true });
}
