import { asc, desc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { postCategories } from "@/db/schema";

import { PostCategoryManager } from "./_components/PostCategoryManager";

const POST_CATEGORY_DRAWER_MODES = ["create", "edit"] as const;

export default async function AdminPostCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    POST_CATEGORY_DRAWER_MODES,
  );

  const items = await db
    .select()
    .from(postCategories)
    .orderBy(asc(postCategories.sortOrder), desc(postCategories.id));

  const editingItem =
    drawerMode === "edit" && id
      ? (items.find((item) => item.id === id) ?? null)
      : null;

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">分类管理</h1>
        <p className="text-sm text-slate-500">管理博客文章分类及展示状态。</p>
      </div>
      <PostCategoryManager
        items={items}
        drawerMode={drawerMode}
        editingItem={editingItem}
      />
    </section>
  );
}
