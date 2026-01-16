import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { commentCaptchaSettings } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

async function loadCaptchaSetting() {
  const [setting] = await db
    .select({
      id: commentCaptchaSettings.id,
      isEnabled: commentCaptchaSettings.isEnabled,
    })
    .from(commentCaptchaSettings)
    .orderBy(desc(commentCaptchaSettings.id))
    .limit(1);

  return setting ?? null;
}

async function upsertCaptchaSetting(enabled: boolean) {
  const setting = await loadCaptchaSetting();
  const isEnabled = enabled ? 1 : 0;

  if (setting?.id) {
    await db
      .update(commentCaptchaSettings)
      .set({ isEnabled })
      .where(eq(commentCaptchaSettings.id, setting.id));
    return;
  }

  await db.insert(commentCaptchaSettings).values({ isEnabled });
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const setting = await loadCaptchaSetting();

  return NextResponse.json({
    ok: true,
    enabled: (setting?.isEnabled ?? 0) === 1,
  });
}

export async function POST() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  await upsertCaptchaSetting(true);
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

  await upsertCaptchaSetting(false);
  return NextResponse.json({ ok: true });
}
