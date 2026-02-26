import { desc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { photoAlbums } from "@/db/schema";
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

  const items = await db
    .select()
    .from(photoAlbums)
    .orderBy(desc(photoAlbums.createdAt), desc(photoAlbums.id));

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">相册管理</h1>
        <p className="text-sm text-slate-500">
          创建相册并上传图片，图片将保存在 photo_album/[album_name_xxx]。
        </p>
      </div>
      <AlbumCreateForm drawerMode={drawerMode} />
      <Card>
        <CardHeader>
          <CardTitle>相册列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AlbumList
            items={items.map((item) => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
            }))}
          />
        </CardContent>
      </Card>
    </section>
  );
}
