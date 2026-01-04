import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { buildOtpAuthUri, generateTotpSecret, verifyTotpToken } from "@/lib/totp";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const [user] = await db
    .select({ totpSecret: adminUsers.totpSecret, email: adminUsers.email })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.sub))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "not found" },
      { status: 404 },
    );
  }

  if (user.totpSecret) {
    return NextResponse.json({ ok: true, enabled: true });
  }

  const secret = generateTotpSecret();
  const otpauth = buildOtpAuthUri({
    secret,
    label: `${user.email}`,
    issuer: process.env.ADMIN_AUTH_ISSUER?.trim() || "handler_blog",
  });

  return NextResponse.json({ ok: true, enabled: false, secret, otpauth });
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

  const data = payload as { secret?: unknown; token?: unknown };
  const secret = typeof data?.secret === "string" ? data.secret.trim() : "";
  const token = typeof data?.token === "string" ? data.token.trim() : "";

  if (!secret || !token) {
    return NextResponse.json(
      { ok: false, error: "secret and token are required" },
      { status: 400 },
    );
  }

  if (!verifyTotpToken(secret, token)) {
    return NextResponse.json(
      { ok: false, error: "invalid token" },
      { status: 400 },
    );
  }

  await db
    .update(adminUsers)
    .set({ totpSecret: secret })
    .where(eq(adminUsers.id, session.sub));

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  await db
    .update(adminUsers)
    .set({ totpSecret: "" })
    .where(eq(adminUsers.id, session.sub));

  return NextResponse.json({ ok: true });
}
