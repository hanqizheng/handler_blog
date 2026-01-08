import { NextResponse } from "next/server";

import { buildAdminSessionClearCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildAdminSessionClearCookie());
  return response;
}
