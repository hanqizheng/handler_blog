import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { siteProfiles } from "@/db/schema";
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

  const [profile] = await db
    .select()
    .from(siteProfiles)
    .orderBy(desc(siteProfiles.id))
    .limit(1);

  return NextResponse.json({ ok: true, profile: profile ?? null });
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
    displayName?: unknown;
    roleTitle?: unknown;
    bio?: unknown;
  };

  const displayName =
    typeof data?.displayName === "string" ? data.displayName.trim() : "";
  const roleTitle =
    typeof data?.roleTitle === "string" ? data.roleTitle.trim() : "";
  const bio = typeof data?.bio === "string" ? data.bio.trim() : "";

  if (!displayName || !bio) {
    return NextResponse.json(
      { ok: false, error: "displayName and bio are required" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({ id: siteProfiles.id })
    .from(siteProfiles)
    .orderBy(desc(siteProfiles.id))
    .limit(1);

  if (existing?.id) {
    await db
      .update(siteProfiles)
      .set({ displayName, roleTitle, bio })
      .where(eq(siteProfiles.id, existing.id));
  } else {
    await db.insert(siteProfiles).values({ displayName, roleTitle, bio });
  }

  return NextResponse.json({ ok: true });
}
