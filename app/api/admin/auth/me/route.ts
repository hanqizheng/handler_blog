import { NextResponse } from "next/server";

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

  return NextResponse.json({
    ok: true,
    user: { id: session.sub, email: session.email },
  });
}
