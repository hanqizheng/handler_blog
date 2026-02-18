import { desc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { siteProfiles } from "@/db/schema";

import { AboutProfileManager } from "./_components/AboutProfileManager";

const ABOUT_DRAWER_MODES = ["edit"] as const;

export default async function AdminAboutPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode } = parseDrawerState(
    resolvedSearchParams,
    ABOUT_DRAWER_MODES,
  );

  const [profile] = await db
    .select()
    .from(siteProfiles)
    .orderBy(desc(siteProfiles.id))
    .limit(1);

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">个人简介</h1>
        <p className="text-sm text-slate-500">
          管理关于我的个人介绍与联系方式（Footer/关于页共用）。
        </p>
      </div>
      <AboutProfileManager
        initialProfile={profile ?? null}
        drawerMode={drawerMode}
      />
    </section>
  );
}
