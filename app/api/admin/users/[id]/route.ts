import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { ensureOwnerAdminUser } from "@/lib/admin-users";

export const runtime = "nodejs";

const parseId = (rawId: string) => {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
};

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const owner = await ensureOwnerAdminUser();
  if (!owner.ok) {
    return NextResponse.json(
      { ok: false, error: owner.error },
      { status: owner.status },
    );
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "invalid id" },
      { status: 400 },
    );
  }

  if (id === owner.user.id) {
    return NextResponse.json(
      { ok: false, error: "cannot delete current owner" },
      { status: 400 },
    );
  }

  const [targetUser] = await db
    .select({ id: adminUsers.id, role: adminUsers.role })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json(
      { ok: false, error: "not found" },
      { status: 404 },
    );
  }

  const targetRole = targetUser.role === "owner" ? "owner" : "admin";
  if (targetRole === "owner") {
    const [ownerCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminUsers)
      .where(eq(adminUsers.role, "owner"));

    if ((ownerCountRow?.count ?? 0) <= 1) {
      return NextResponse.json(
        { ok: false, error: "cannot delete last owner" },
        { status: 400 },
      );
    }
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, id));

  return NextResponse.json({ ok: true });
}
