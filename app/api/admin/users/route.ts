import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { ensureOwnerAdminUser } from "@/lib/admin-users";

export const runtime = "nodejs";

const toIsoString = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

export async function GET() {
  const owner = await ensureOwnerAdminUser();
  if (!owner.ok) {
    return NextResponse.json(
      { ok: false, error: owner.error },
      { status: owner.status },
    );
  }

  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      role: adminUsers.role,
      totpSecret: adminUsers.totpSecret,
      createdBy: adminUsers.createdBy,
      createdAt: adminUsers.createdAt,
      updatedAt: adminUsers.updatedAt,
    })
    .from(adminUsers)
    .orderBy(asc(adminUsers.role), asc(adminUsers.id));

  const items = rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role === "owner" ? "owner" : "admin",
    totpEnabled: row.totpSecret.length > 0,
    createdBy: row.createdBy,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }));

  return NextResponse.json({
    ok: true,
    currentUserId: owner.user.id,
    items,
  });
}
