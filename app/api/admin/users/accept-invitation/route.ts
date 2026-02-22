import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { adminUserInvitations, adminUsers } from "@/db/schema";
import { buildAdminSessionCookie, createAdminSessionToken } from "@/lib/admin-auth";
import { hashInvitationToken } from "@/lib/admin-invitations";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

const toMillis = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.getTime();
};

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as {
    token?: unknown;
    password?: unknown;
  };

  const token = typeof data?.token === "string" ? data.token.trim() : "";
  const password =
    typeof data?.password === "string" ? data.password.trim() : "";

  if (!token || !password) {
    return NextResponse.json(
      { ok: false, error: "token and password are required" },
      { status: 400 },
    );
  }

  const tokenHash = hashInvitationToken(token);
  const passwordHash = hashPassword(password);
  const now = new Date();

  let acceptResult:
    | {
        ok: true;
        userId: number;
        email: string;
      }
    | {
        ok: false;
        status: number;
        error: string;
      };

  try {
    acceptResult = await db.transaction(async (tx) => {
      const [invitation] = await tx
        .select({
          id: adminUserInvitations.id,
          email: adminUserInvitations.email,
          createdBy: adminUserInvitations.createdBy,
          expiresAt: adminUserInvitations.expiresAt,
          usedAt: adminUserInvitations.usedAt,
        })
        .from(adminUserInvitations)
        .where(eq(adminUserInvitations.tokenHash, tokenHash))
        .limit(1)
        .for("update");

      if (!invitation) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "invalid invitation token" as const,
        };
      }

      if (invitation.usedAt) {
        return {
          ok: false as const,
          status: 409 as const,
          error: "invitation already used" as const,
        };
      }

      if (toMillis(invitation.expiresAt) <= now.getTime()) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "invitation expired" as const,
        };
      }

      const [existingAdminUser] = await tx
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.email, invitation.email))
        .limit(1)
        .for("update");

      if (existingAdminUser) {
        return {
          ok: false as const,
          status: 409 as const,
          error: "admin user already exists" as const,
        };
      }

      const insertResult = await tx
        .insert(adminUsers)
        .values({
          email: invitation.email,
          passwordHash,
          role: "admin",
          createdBy: invitation.createdBy,
        })
        .execute();

      const userId =
        "insertId" in insertResult && typeof insertResult.insertId === "number"
          ? insertResult.insertId
          : 0;

      if (!userId) {
        return {
          ok: false as const,
          status: 500 as const,
          error: "failed to create admin user" as const,
        };
      }

      await tx
        .update(adminUserInvitations)
        .set({ usedAt: now })
        .where(
          and(
            eq(adminUserInvitations.id, invitation.id),
            eq(adminUserInvitations.tokenHash, tokenHash),
          ),
        );

      return {
        ok: true as const,
        userId,
        email: invitation.email,
      };
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "failed to accept invitation" },
      { status: 500 },
    );
  }

  if (!acceptResult.ok) {
    return NextResponse.json(
      { ok: false, error: acceptResult.error },
      { status: acceptResult.status },
    );
  }

  const tokenValue = createAdminSessionToken({
    userId: acceptResult.userId,
    email: acceptResult.email,
    actorType: "owner",
  });

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", buildAdminSessionCookie(tokenValue));
  return response;
}
