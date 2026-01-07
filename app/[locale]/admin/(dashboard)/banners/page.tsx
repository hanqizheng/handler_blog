import { asc, desc } from "drizzle-orm";

import { db } from "@/db";
import { banners } from "@/db/schema";

import { BannerManager } from "./_components/BannerManager";

export default async function AdminBannersPage() {
  const items = await db
    .select()
    .from(banners)
    .orderBy(asc(banners.sortOrder), desc(banners.id));

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Banner 管理</h1>
        <p className="text-sm text-slate-500">
          管理首页 Banner 图片与展示顺序。
        </p>
      </div>
      <BannerManager initialItems={items} />
    </section>
  );
}
