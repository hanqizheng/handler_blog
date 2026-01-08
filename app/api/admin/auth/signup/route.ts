import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { buildAdminSessionCookie, createAdminSessionToken, getAdminSession } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as { email?: unknown; password?: unknown };
  const email = typeof data?.email === "string" ? data.email.trim() : "";
  const password =
    typeof data?.password === "string" ? data.password.trim() : "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email and password are required" },
      { status: 400 },
    );
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adminUsers);
  const hasAnyUser = (countRow?.count ?? 0) > 0;

  if (hasAnyUser) {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
  }

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "email already exists" },
      { status: 400 },
    );
  }

  const passwordHash = hashPassword(password);
  const result = await db
    .insert(adminUsers)
    .values({ email, passwordHash })
    .execute();

  const userId =
    "insertId" in result && typeof result.insertId === "number"
      ? result.insertId
      : 0;

  if (!hasAnyUser && userId) {
    const token = createAdminSessionToken({ userId, email });
    const response = NextResponse.json({ ok: true });
    response.headers.set("Set-Cookie", buildAdminSessionCookie(token));
    return response;
  }

  return NextResponse.json({ ok: true });
}
