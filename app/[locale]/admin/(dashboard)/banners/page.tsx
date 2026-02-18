import { asc, desc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { banners } from "@/db/schema";

import { BannerManager } from "./_components/BannerManager";

const BANNER_DRAWER_MODES = ["create", "edit"] as const;

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    BANNER_DRAWER_MODES,
  );

  const items = await db
    .select()
    .from(banners)
    .orderBy(asc(banners.sortOrder), desc(banners.id));

  const editingItem =
    drawerMode === "edit" && id
      ? (items.find((item) => item.id === id) ?? null)
      : null;

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Banner 管理</h1>
        <p className="text-sm text-slate-500">
          管理首页 Banner 图片与展示顺序。
        </p>
      </div>
      <BannerManager
        items={items}
        drawerMode={drawerMode}
        editingItem={editingItem}
      />
    </section>
  );
}
