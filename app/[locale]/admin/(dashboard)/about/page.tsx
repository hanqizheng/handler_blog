import { desc } from "drizzle-orm";

import { db } from "@/db";
import { siteProfiles } from "@/db/schema";

import { AboutProfileManager } from "./_components/AboutProfileManager";

export default async function AdminAboutPage() {
  const [profile] = await db
    .select()
    .from(siteProfiles)
    .orderBy(desc(siteProfiles.id))
    .limit(1);

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">个人简介</h1>
        <p className="text-sm text-slate-500">管理关于我的个人介绍内容。</p>
      </div>
      <AboutProfileManager initialProfile={profile ?? null} />
    </section>
  );
}
