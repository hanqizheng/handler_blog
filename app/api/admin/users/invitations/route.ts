import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUserInvitations, adminUsers } from "@/db/schema";
import {
  buildInvitationPath,
  buildInvitationUrl,
  generateInvitationToken,
  getInvitationExpiresMinutes,
  hashInvitationToken,
} from "@/lib/admin-invitations";
import { ensureOwnerAdminUser } from "@/lib/admin-users";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const owner = await ensureOwnerAdminUser();
  if (!owner.ok) {
    return NextResponse.json(
      { ok: false, error: owner.error },
      { status: owner.status },
    );
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as { email?: unknown };
  const email = typeof data?.email === "string" ? data.email.trim() : "";

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { ok: false, error: "invalid email" },
      { status: 400 },
    );
  }

  const [existingAdminUser] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (existingAdminUser) {
    return NextResponse.json(
      { ok: false, error: "admin user already exists" },
      { status: 409 },
    );
  }

  const now = new Date();
  const [activeInvitation] = await db
    .select({ id: adminUserInvitations.id })
    .from(adminUserInvitations)
    .where(
      and(
        eq(adminUserInvitations.email, email),
        isNull(adminUserInvitations.usedAt),
        gt(adminUserInvitations.expiresAt, now),
      ),
    )
    .limit(1);

  if (activeInvitation) {
    return NextResponse.json(
      { ok: false, error: "active invitation already exists" },
      { status: 409 },
    );
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresInMinutes = getInvitationExpiresMinutes();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60_000);

  await db.insert(adminUserInvitations).values({
    email,
    tokenHash,
    expiresAt,
    createdBy: owner.user.id,
  });

  return NextResponse.json({
    ok: true,
    invitation: {
      email,
      expiresAt: expiresAt.toISOString(),
      invitePath: buildInvitationPath(token),
      inviteUrl: buildInvitationUrl(token),
    },
  });
}
