import { desc, eq, asc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { albumCategories, photoAlbums } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AlbumCreateForm } from "./_components/AlbumCreateForm";
import { AlbumList } from "./_components/AlbumList";

const ALBUM_DRAWER_MODES = ["create"] as const;

export default async function AdminAlbumsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode } = parseDrawerState(
    resolvedSearchParams,
    ALBUM_DRAWER_MODES,
  );

  const [items, categories] = await Promise.all([
    db
      .select({
        id: photoAlbums.id,
        name: photoAlbums.name,
        slug: photoAlbums.slug,
        description: photoAlbums.description,
        coverUrl: photoAlbums.coverUrl,
        categoryId: photoAlbums.categoryId,
        categoryName: albumCategories.name,
        createdAt: photoAlbums.createdAt,
      })
      .from(photoAlbums)
      .leftJoin(albumCategories, eq(photoAlbums.categoryId, albumCategories.id))
      .orderBy(desc(photoAlbums.createdAt), desc(photoAlbums.id)),
    db
      .select()
      .from(albumCategories)
      .where(eq(albumCategories.isActive, 1))
      .orderBy(asc(albumCategories.sortOrder), desc(albumCategories.id)),
  ]);

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">相册管理</h1>
        <p className="text-sm text-slate-500">
          创建相册并上传图片，图片将保存在 photo_album/[album_name_xxx]。
        </p>
      </div>
      <AlbumCreateForm drawerMode={drawerMode} categories={categories} />
      <Card>
        <CardHeader>
          <CardTitle>相册列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AlbumList items={items} />
        </CardContent>
      </Card>
    </section>
  );
}
