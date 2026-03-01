import { asc, desc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { albumCategories, postCategories } from "@/db/schema";

import { CategoriesTabManager } from "./_components/CategoriesTabManager";

const CATEGORY_DRAWER_MODES = ["create", "edit"] as const;

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab === "album" ? "album" : "post";
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    CATEGORY_DRAWER_MODES,
  );

  const [postItems, albumItems] = await Promise.all([
    db
      .select()
      .from(postCategories)
      .orderBy(asc(postCategories.sortOrder), desc(postCategories.id)),
    db
      .select()
      .from(albumCategories)
      .orderBy(asc(albumCategories.sortOrder), desc(albumCategories.id)),
  ]);

  const editingPostItem =
    tab === "post" && drawerMode === "edit" && id
      ? (postItems.find((item) => item.id === id) ?? null)
      : null;

  const editingAlbumItem =
    tab === "album" && drawerMode === "edit" && id
      ? (albumItems.find((item) => item.id === id) ?? null)
      : null;

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">分类管理</h1>
        <p className="text-sm text-slate-500">管理文章分类与相册分类。</p>
      </div>
      <CategoriesTabManager
        activeTab={tab}
        postItems={postItems}
        albumItems={albumItems}
        drawerMode={drawerMode}
        editingPostItem={editingPostItem}
        editingAlbumItem={editingAlbumItem}
      />
    </section>
  );
}
