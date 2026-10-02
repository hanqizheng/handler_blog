import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await db.execute(sql`SELECT id FROM posts LIMIT 1`);
    return NextResponse.json(
      { status: "healthy", database: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Do not return connection URLs, SQL errors or credentials to clients/CI logs.
    console.error("[health] Database check failed");
    return NextResponse.json(
      { status: "degraded", database: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
