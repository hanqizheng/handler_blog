import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { buildAdminSessionCookie, createAdminSessionToken } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password";
import { verifyTotpToken } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as {
    email?: unknown;
    password?: unknown;
    totp?: unknown;
  };

  const email = typeof data?.email === "string" ? data.email.trim() : "";
  const password =
    typeof data?.password === "string" ? data.password.trim() : "";
  const totp = typeof data?.totp === "string" ? data.totp.trim() : "";

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email and password are required" },
      { status: 400 },
    );
  }

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { ok: false, error: "invalid credentials" },
      { status: 401 },
    );
  }

  if (user.totpSecret) {
    if (!totp) {
      return NextResponse.json(
        { ok: false, requireTotp: true, error: "totp required" },
        { status: 401 },
      );
    }
    if (!verifyTotpToken(user.totpSecret, totp)) {
      return NextResponse.json(
        { ok: false, requireTotp: true, error: "invalid totp" },
        { status: 401 },
      );
    }
  }

  const token = createAdminSessionToken({
    userId: user.id,
    email: user.email,
  });

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildAdminSessionCookie(token));
  return response;
}
