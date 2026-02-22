import { gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { buildAdminSessionCookie, createAdminSessionToken } from "@/lib/admin-auth";
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

  const passwordHash = hashPassword(password);
  let createResult:
    | { ok: true; userId: number }
    | { ok: false; reason: "has-user" | "insert-failed" };
  try {
    createResult = await db.transaction(async (tx) => {
      // Lock admin user range to serialize first-account creation.
      await tx
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(gte(adminUsers.id, 0))
        .for("update");

      const [countRow] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(adminUsers);
      const hasAnyUser = (countRow?.count ?? 0) > 0;
      if (hasAnyUser) {
        return { ok: false as const, reason: "has-user" as const };
      }

      const result = await tx
        .insert(adminUsers)
        .values({ email, passwordHash, role: "owner", createdBy: null })
        .execute();

      const userId =
        "insertId" in result && typeof result.insertId === "number"
          ? result.insertId
          : 0;
      if (!userId) {
        return { ok: false as const, reason: "insert-failed" as const };
      }

      return { ok: true as const, userId };
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "failed to create admin user" },
      { status: 500 },
    );
  }

  if (!createResult.ok) {
    if (createResult.reason === "has-user") {
      return NextResponse.json(
        { ok: false, error: "forbidden" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "failed to create admin user" },
      { status: 500 },
    );
  }

  const token = createAdminSessionToken({
    userId: createResult.userId,
    email,
    actorType: "owner",
  });
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildAdminSessionCookie(token));
  return response;
}
